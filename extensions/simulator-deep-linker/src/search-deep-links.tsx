import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
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

const executeFile = promisify(execFile);

type Preferences = {
  storageFile?: string;
  defaultEnvironment?: string;
  platform: "ios" | "ios-device" | "android";
  target: string;
  bundleIdentifier?: string;
  androidPackage?: string;
};

type IntegrationManifest = {
  schemaVersion: number;
  storagePath: string;
  environmentsPath: string;
};

type StorageConfiguration = {
  storagePath: string;
  environmentsPath: string;
};

type DeepLink = {
  id: string;
  title: string;
  urlString: string;
  group?: string;
  tags?: string[];
  isFavorite?: boolean;
};

type LinkEnvironment = {
  id: string;
  name: string;
  variables: Record<string, string>;
  isBuiltIn?: boolean;
};

const builtInEnvironments: LinkEnvironment[] = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Development", variables: {}, isBuiltIn: true },
  { id: "00000000-0000-0000-0000-000000000002", name: "Production", variables: {}, isBuiltIn: true },
];

export default function SearchDeepLinks() {
  const preferences = getPreferenceValues<Preferences>();
  const [links, setLinks] = useState<DeepLink[]>([]);
  const [environments, setEnvironments] = useState<LinkEnvironment[]>(builtInEnvironments);
  const [selectedEnvironment, setSelectedEnvironment] = useState(preferences.defaultEnvironment || "Development");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [storageConfiguration, setStorageConfiguration] = useState<StorageConfiguration>();

  async function load() {
    setIsLoading(true);
    setError(undefined);
    try {
      const configuration = await resolveStorageConfiguration(preferences.storageFile);
      const linkData = await readFile(configuration.storagePath, "utf8");
      const decodedLinks = JSON.parse(linkData) as DeepLink[];
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

  const sortedLinks = useMemo(
    () => [...links].sort((left, right) => Number(Boolean(right.isFavorite)) - Number(Boolean(left.isFavorite))),
    [links],
  );

  async function openLink(link: DeepLink) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Opening ${link.title}` });
    try {
      const resolvedURL = resolve(link.urlString, selectedEnvironment, environments);
      await openURL(resolvedURL, preferences);
      toast.style = Toast.Style.Success;
      toast.title = "Deep Link Opened";
      toast.message = resolvedURL;
    } catch (openError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Open Deep Link";
      toast.message = commandError(openError);
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
          return (
            <List.Item
              key={link.id}
              icon={link.isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Link}
              title={link.title}
              subtitle={resolvedURL}
              keywords={[link.urlString, link.group ?? "", ...(link.tags ?? [])]}
              accessories={[
                ...(link.group ? [{ tag: link.group }] : []),
                ...(link.tags ?? []).slice(0, 2).map((tag) => ({ tag })),
              ]}
              actions={
                <ActionPanel>
                  <Action title="Open Deep Link" icon={Icon.Play} onAction={() => openLink(link)} />
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
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

async function resolveStorageConfiguration(storageOverride?: string): Promise<StorageConfiguration> {
  if (storageOverride) {
    await access(storageOverride);
    return {
      storagePath: storageOverride,
      environmentsPath: path.join(path.dirname(storageOverride), "environments.json"),
    };
  }

  const applicationSupport = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "com.stefan.SimulatorDeepLinker",
  );
  const manifestPath = path.join(applicationSupport, "integration.json");

  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as IntegrationManifest;
    if (manifest.schemaVersion !== 1 || !manifest.storagePath) {
      throw new Error("Unsupported SimulatorDeepLinker integration manifest.");
    }
    await access(manifest.storagePath);
    return {
      storagePath: manifest.storagePath,
      environmentsPath: manifest.environmentsPath || path.join(path.dirname(manifest.storagePath), "environments.json"),
    };
  } catch (manifestError) {
    const defaultStoragePath = path.join(applicationSupport, "deeplinks.json");
    try {
      await access(defaultStoragePath);
      return {
        storagePath: defaultStoragePath,
        environmentsPath: path.join(applicationSupport, "environments.json"),
      };
    } catch {
      const reason = manifestError instanceof Error ? manifestError.message : String(manifestError);
      throw new Error(
        `Open SimulatorDeepLinker once to configure automatic storage, or select a Storage Override. ${reason}`,
      );
    }
  }
}

async function openURL(urlString: string, preferences: Preferences): Promise<void> {
  const url = new URL(urlString);
  if (!url.protocol) throw new Error("The deep link must include a URL scheme.");

  switch (preferences.platform) {
    case "ios":
      await executeFile("/usr/bin/xcrun", ["simctl", "openurl", preferences.target || "booted", urlString]);
      return;
    case "ios-device":
      if (!preferences.bundleIdentifier) {
        throw new Error("Set the Apple Bundle Identifier in extension preferences.");
      }
      await executeFile("/usr/bin/xcrun", [
        "devicectl",
        "device",
        "process",
        "launch",
        "--device",
        preferences.target,
        preferences.bundleIdentifier,
        "--payload-url",
        urlString,
      ]);
      return;
    case "android": {
      const adb = await locateADB();
      const argumentsList = [
        "-s",
        preferences.target,
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        urlString,
      ];
      if (preferences.androidPackage) argumentsList.push(preferences.androidPackage);
      await executeFile(adb, argumentsList);
    }
  }
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

function commandError(error: unknown): string {
  if (typeof error === "object" && error && "stderr" in error) {
    return String((error as { stderr?: string }).stderr || "Command failed").trim();
  }
  return error instanceof Error ? error.message : String(error);
}
