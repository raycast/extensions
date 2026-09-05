import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { useEffect, useMemo, useState } from "react";
import {
  DeepLink,
  StorageConfiguration,
  deleteDeepLink,
  readDeepLinks,
  resolveStorageConfiguration,
} from "./storage.js";

const executeFile = promisify(execFile);

type LinkEnvironment = {
  id: string;
  name: string;
  variables: Record<string, string>;
  isBuiltIn?: boolean;
};

type TargetDevice = {
  id: string;
  name: string;
  detail?: string;
};

const builtInEnvironments: LinkEnvironment[] = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Development", variables: {}, isBuiltIn: true },
  { id: "00000000-0000-0000-0000-000000000002", name: "Production", variables: {}, isBuiltIn: true },
];

export default function SearchDeepLinks() {
  const preferences = getPreferenceValues<Preferences.SearchDeepLinks>();
  const [links, setLinks] = useState<DeepLink[]>([]);
  const [environments, setEnvironments] = useState<LinkEnvironment[]>(builtInEnvironments);
  const [selectedEnvironment, setSelectedEnvironment] = useState(preferences.defaultEnvironment || "Development");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [storageConfiguration, setStorageConfiguration] = useState<StorageConfiguration>();
  const [targetDevices, setTargetDevices] = useState<TargetDevice[]>([]);
  const [selectedTarget, setSelectedTarget] = useState(
    preferences.target?.trim() || defaultTarget(preferences.platform),
  );
  const [targetDiscoveryError, setTargetDiscoveryError] = useState<string>();

  async function load() {
    setIsLoading(true);
    setError(undefined);
    try {
      const configuration = await resolveStorageConfiguration(preferences.storageFile);
      const decodedLinks = await readDeepLinks(configuration.storagePath);
      const decodedEnvironments = await readFile(configuration.environmentsPath, "utf8")
        .then((value) => JSON.parse(value) as LinkEnvironment[])
        .catch(() => builtInEnvironments);

      setStorageConfiguration(configuration);
      setLinks(decodedLinks);
      setEnvironments(decodedEnvironments);
      if (!decodedEnvironments.some((environment) => environment.name === selectedEnvironment)) {
        setSelectedEnvironment(decodedEnvironments[0]?.name ?? "Development");
      }
    } catch (loadError) {
      setStorageConfiguration(undefined);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [preferences.storageFile]);

  async function loadTargetDevices(showFailure = false) {
    setTargetDiscoveryError(undefined);
    try {
      const devices = await discoverTargets(preferences.platform);
      setTargetDevices(devices);
      setSelectedTarget((currentTarget) => {
        if (
          currentTarget &&
          ((preferences.platform === "ios" && currentTarget === "booted") ||
            devices.some((device) => device.id === currentTarget))
        ) {
          return currentTarget;
        }
        return devices[0]?.id || preferences.target?.trim() || defaultTarget(preferences.platform);
      });
    } catch (discoveryError) {
      const message = commandError(discoveryError);
      setTargetDevices([]);
      setTargetDiscoveryError(message);
      if (showFailure) {
        await showToast({ style: Toast.Style.Failure, title: "Could Not Load Devices", message });
      }
    }
  }

  useEffect(() => {
    setSelectedTarget(preferences.target?.trim() || defaultTarget(preferences.platform));
    void loadTargetDevices();
  }, [preferences.platform, preferences.target]);

  const sortedLinks = useMemo(
    () => [...links].sort((left, right) => Number(Boolean(right.isFavorite)) - Number(Boolean(left.isFavorite))),
    [links],
  );

  async function openLink(link: DeepLink) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Opening ${link.title}` });
    try {
      const resolvedURL = resolve(link.urlString, selectedEnvironment, environments);
      assertCanOpen(resolvedURL, selectedEnvironment);
      await openURL(resolvedURL, preferences, selectedTarget);
      toast.style = Toast.Style.Success;
      toast.title = "Deep Link Opened";
      toast.message = resolvedURL;
    } catch (openError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Open Deep Link";
      toast.message = commandError(openError);
    }
  }

  async function deleteLink(link: DeepLink) {
    if (!storageConfiguration) return;
    const confirmed = await confirmAlert({
      title: `Delete “${link.title}”?`,
      message: "This removes the deep link from the shared Simulator Deep Linker storage and cannot be undone.",
      primaryAction: {
        title: "Delete Deep Link",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting Deep Link" });
    try {
      await deleteDeepLink(storageConfiguration, link.id);
      setLinks((currentLinks) => currentLinks.filter((candidate) => candidate.id !== link.id));
      toast.style = Toast.Style.Success;
      toast.title = "Deep Link Deleted";
      toast.message = link.title;
    } catch (deleteError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Delete Deep Link";
      toast.message = deleteError instanceof Error ? deleteError.message : String(deleteError);
      await load();
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by name, URL, group, or tag"
      searchBarAccessory={
        <List.Dropdown tooltip="Environment" value={selectedEnvironment} onChange={setSelectedEnvironment}>
          {environments.map((environment) => (
            <List.Dropdown.Item key={environment.id} title={environment.name} value={environment.name} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Read Storage"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={load} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        sortedLinks.map((link) => {
          const resolvedURL = resolve(link.urlString, selectedEnvironment, environments);
          const unresolvedVariables = findUnresolvedVariables(resolvedURL);
          return (
            <List.Item
              key={link.id}
              icon={link.isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Link}
              title={link.title}
              subtitle={resolvedURL}
              keywords={[link.urlString, link.group ?? "", ...(link.tags ?? [])]}
              accessories={[
                ...(unresolvedVariables.length > 0 ? [{ tag: `Unresolved: ${unresolvedVariables.join(", ")}` }] : []),
                ...(link.group ? [{ tag: link.group }] : []),
                ...(link.tags ?? []).slice(0, 2).map((tag) => ({ tag })),
              ]}
              actions={
                <ActionPanel>
                  <Action title="Open Deep Link" icon={Icon.Play} onAction={() => openLink(link)} />
                  {preferences.platform === "ios" || preferences.platform === "android" ? (
                    <ActionPanel.Submenu
                      title={`Select Target Device${targetName(selectedTarget, targetDevices) ? ` (${targetName(selectedTarget, targetDevices)})` : ""}`}
                      icon={Icon.Mobile}
                    >
                      {preferences.platform === "ios" ? (
                        <Action
                          title="Booted Simulator"
                          icon={selectedTarget === "booted" ? Icon.Checkmark : Icon.Mobile}
                          onAction={() => setSelectedTarget("booted")}
                        />
                      ) : null}
                      {targetDevices.map((device) => (
                        <Action
                          key={device.id}
                          title={`${device.name}${device.detail ? ` (${device.detail})` : ""}`}
                          icon={selectedTarget === device.id ? Icon.Checkmark : Icon.Mobile}
                          onAction={() => setSelectedTarget(device.id)}
                        />
                      ))}
                      {targetDevices.length === 0 && preferences.platform === "android" ? (
                        <Action
                          title={targetDiscoveryError ? "Device Discovery Failed" : "No Connected Android Devices"}
                          icon={Icon.ExclamationMark}
                          onAction={() => loadTargetDevices(true)}
                        />
                      ) : null}
                      <Action
                        title="Refresh Devices"
                        icon={Icon.ArrowClockwise}
                        onAction={() => loadTargetDevices(true)}
                      />
                    </ActionPanel.Submenu>
                  ) : null}
                  <Action.CopyToClipboard title="Copy Resolved URL" content={resolvedURL} />
                  <Action.CopyToClipboard
                    title="Copy Template URL"
                    content={link.urlString}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={load}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                  {storageConfiguration ? <Action.ShowInFinder path={storageConfiguration.storagePath} /> : null}
                  {storageConfiguration ? (
                    <Action
                      title="Delete Deep Link"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => deleteLink(link)}
                    />
                  ) : null}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

async function openURL(
  urlString: string,
  preferences: Preferences.SearchDeepLinks,
  selectedTarget?: string,
): Promise<void> {
  const target = selectedTarget?.trim() || preferences.target?.trim();

  switch (preferences.platform) {
    case "ios":
      await executeFile("/usr/bin/xcrun", ["simctl", "openurl", target || "booted", urlString]);
      return;
    case "ios-device":
      if (!target) {
        throw new Error("Set a physical Apple device identifier in extension preferences.");
      }
      if (!preferences.bundleIdentifier) {
        throw new Error("Set the Apple Bundle Identifier in extension preferences.");
      }
      await executeFile("/usr/bin/xcrun", [
        "devicectl",
        "device",
        "process",
        "launch",
        "--device",
        target,
        preferences.bundleIdentifier,
        "--payload-url",
        urlString,
      ]);
      return;
    case "android": {
      if (!target) {
        throw new Error("Connect an Android device or set a fallback ADB device serial in extension preferences.");
      }
      const adb = await locateADB();
      const argumentsList = [
        "-s",
        target,
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        urlString,
      ];
      if (preferences.androidPackage?.trim()) argumentsList.push("-p", preferences.androidPackage.trim());
      await executeFile(adb, argumentsList);
    }
  }
}

async function discoverTargets(platform: Preferences.SearchDeepLinks["platform"]): Promise<TargetDevice[]> {
  if (platform === "ios") {
    const { stdout } = await executeFile("/usr/bin/xcrun", ["simctl", "list", "devices", "available", "--json"]);
    const response = JSON.parse(stdout) as {
      devices?: Record<string, Array<{ isAvailable?: boolean; name: string; state: string; udid: string }>>;
    };

    return Object.entries(response.devices ?? {}).flatMap(([runtime, devices]) =>
      devices
        .filter((device) => device.isAvailable !== false && device.state === "Booted")
        .map((device) => ({ id: device.udid, name: device.name, detail: simulatorRuntimeName(runtime) })),
    );
  }

  if (platform === "android") {
    const adb = await locateADB();
    const { stdout } = await executeFile(adb, ["devices", "-l"]);
    return stdout
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        const [id, state, ...attributes] = line.split(/\s+/);
        if (!id || state !== "device") return [];
        const model = attributes.find((attribute) => attribute.startsWith("model:"))?.slice("model:".length);
        return [{ id, name: model?.replaceAll("_", " ") || id, detail: model ? id : undefined }];
      });
  }

  return [];
}

async function locateADB(): Promise<string> {
  const candidates = [
    process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, "platform-tools", "adb") : undefined,
    process.env.ANDROID_SDK_ROOT ? path.join(process.env.ANDROID_SDK_ROOT, "platform-tools", "adb") : undefined,
    path.join(os.homedir(), "Library", "Android", "sdk", "platform-tools", "adb"),
    "/opt/homebrew/bin/adb",
    "/usr/local/bin/adb",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error("ADB was not found. Install Android Platform Tools or configure ANDROID_HOME.");
}

function resolve(source: string, environmentName: string, environments: LinkEnvironment[]): string {
  const environment = environments.find((candidate) => candidate.name === environmentName);
  return Object.entries(environment?.variables ?? {}).reduce(
    (value, [key, replacement]) => value.replaceAll(`{{${key}}}`, replacement).replaceAll(`\${${key}}`, replacement),
    source,
  );
}

function findUnresolvedVariables(value: string): string[] {
  const variables = new Set<string>();
  for (const match of value.matchAll(/{{\s*([^{}]+?)\s*}}|\${([^{}]+)}/g)) {
    variables.add((match[1] || match[2]).trim());
  }
  return [...variables];
}

function assertCanOpen(urlString: string, environmentName: string): void {
  const unresolvedVariables = findUnresolvedVariables(urlString);
  if (unresolvedVariables.length > 0) {
    throw new Error(
      `Configure ${unresolvedVariables.join(", ")} in the ${environmentName} environment before opening this link.`,
    );
  }

  try {
    new URL(urlString);
  } catch {
    throw new Error("The deep link is malformed or does not include a URL scheme (for example, myapp://).");
  }
}

function defaultTarget(platform: Preferences.SearchDeepLinks["platform"]): string | undefined {
  return platform === "ios" ? "booted" : undefined;
}

function targetName(selectedTarget: string | undefined, devices: TargetDevice[]): string | undefined {
  if (!selectedTarget) return undefined;
  if (selectedTarget === "booted") return "Booted Simulator";
  return devices.find((device) => device.id === selectedTarget)?.name || selectedTarget;
}

function simulatorRuntimeName(runtime: string): string {
  const match = runtime.match(/SimRuntime\.([^-]+)-(\d+)-(\d+)$/);
  return match ? `${match[1]} ${match[2]}.${match[3]}` : runtime.split(".").at(-1) || runtime;
}

function commandError(error: unknown): string {
  if (typeof error === "object" && error && "stderr" in error) {
    return String((error as { stderr?: string }).stderr || "Command failed").trim();
  }
  return error instanceof Error ? error.message : String(error);
}
