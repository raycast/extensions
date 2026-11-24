import { Action, ActionPanel, Clipboard, Form, Icon, Keyboard, open, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedState, useForm, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef } from "react";
import { useDevices } from "../hooks/use-devices";
import { Organization, useOrganization } from "../hooks/use-organization";
import { Device, sortDevices } from "../lib/devices";
import { launchSourceWithFeedback } from "../lib/feedback";
import { getSourcePlatform, isAppFile, LaunchSource, openInOrbitApp, parseLaunchSource } from "../lib/launch";
import { ORBIT_DOWNLOAD_URL, OrbitNotInstalledError } from "../lib/orbit";
import { sortPinnedFirst } from "../lib/organization";
import { getDeviceIcon, getDeviceOptionTitle, OS_TYPES } from "../lib/presentation";

type Values = {
  url: string;
  file: string[];
  deviceId: string;
};

const SOURCE_DESCRIPTIONS: Record<LaunchSource["kind"], string> = {
  build: "EAS Build: downloads the build, then installs and launches it.",
  file: "App file: installs and launches it.",
  update: "EAS Update: opens it in a compatible development build, or in Expo Go.",
  snack: "Snack: opens it in Expo Go, installing Expo Go when needed.",
};

function getSource(values: Pick<Values, "url" | "file">): LaunchSource {
  const file = values.file[0];
  if (file) return { kind: "file", path: file };
  return parseLaunchSource(values.url);
}

function tryGetSource(values: Pick<Values, "url" | "file">): LaunchSource | undefined {
  try {
    return getSource(values);
  } catch {
    return undefined;
  }
}

/** The device to preselect: the last one used, then a running one, then any. */
function pickDefaultDevice(
  devices: Device[],
  pinnedKeys: string[],
  lastDeviceId: string | undefined,
  platform?: "ios" | "android",
) {
  const candidates = sortPinnedFirst(
    sortDevices(platform ? devices.filter((device) => device.platform === platform) : devices),
    pinnedKeys,
  );
  return candidates.find((device) => device.id === lastDeviceId) ?? candidates[0];
}

/** Pinned devices first, then physical devices, then simulators and emulators by platform, like Manage Devices. */
function getDeviceGroups(devices: Device[], organization: Organization): { title: string; devices: Device[] }[] {
  const pinned = devices
    .filter(organization.isPinned)
    .sort((a, b) => organization.pinIndex(a) - organization.pinIndex(b));
  const rest = devices.filter((device) => !organization.isPinned(device));
  const groups = [
    { title: "Pinned", devices: pinned },
    { title: "Physical Devices", devices: sortDevices(rest.filter((device) => device.kind === "device")) },
    ...OS_TYPES.map((osType) => ({
      title: osType === "Android" ? "Android Emulators" : `${osType} Simulators`,
      devices: sortDevices(rest.filter((device) => device.kind !== "device" && device.osType === osType)),
    })),
  ];
  return groups.filter((group) => group.devices.length > 0);
}

export function LaunchForm(props: { initialUrl?: string; device?: Device }) {
  const navigation = useNavigation();
  const { data, isLoading, error, revalidate } = useDevices();
  const devices = useMemo(() => data?.devices ?? [], [data]);
  const organization = useOrganization();
  // Hidden devices stay out of the way here too, unless the form opened for one.
  const visibleDevices = devices.filter((device) => !organization.isHidden(device) || device.id === props.device?.id);
  const [lastDeviceId, setLastDeviceId] = useCachedState<string | undefined>("last-launch-device", undefined);

  // A chosen file takes the place of the URL, so the URL isn't checked while there is one.
  const hasFileRef = useRef(false);

  const { handleSubmit, itemProps, values, setValue, setValidationError } = useForm<Values>({
    initialValues: { url: props.initialUrl ?? "", file: [], deviceId: props.device?.id ?? "" },
    validation: {
      url: (value) => {
        if (hasFileRef.current || !value?.trim()) return undefined;
        try {
          parseLaunchSource(value);
          return undefined;
        } catch (parseError) {
          return parseError instanceof Error ? parseError.message : "This URL isn't supported";
        }
      },
      file: (value) => {
        const file = value?.[0];
        if (file && !isAppFile(file)) return "Choose an .apk, .app, .ipa, or .tar.gz file";
        return undefined;
      },
      deviceId: (value) => (value ? undefined : "Choose a device"),
    },
    onSubmit: async (submitted) => {
      if (submitted.file.length === 0 && !submitted.url.trim()) {
        setValidationError("url", "Enter a URL or choose a file");
        return false;
      }
      const device = devices.find((candidate) => candidate.id === submitted.deviceId);
      if (!device) {
        await showFailureToast(new Error("The device isn't available anymore. Choose another one."), {
          title: "Device Not Found",
        });
        return;
      }
      await launchSourceWithFeedback(getSource(submitted), device, {
        onSuccess: () => {
          setLastDeviceId(device.id);
          void revalidate();
          if (props.device) navigation.pop();
        },
      });
    },
  });

  hasFileRef.current = values.file.length > 0;
  useEffect(() => {
    if (hasFileRef.current) setValidationError("url", undefined);
  }, [values.file]);

  // Fill in a supported URL from the clipboard, like Orbit does when you copy an "Open with Orbit" link.
  const { data: clipboardText } = usePromise(() => Clipboard.readText(), [], { execute: !props.initialUrl });
  useEffect(() => {
    if (!clipboardText || values.url || values.file.length > 0) return;
    const source = tryGetSource({ url: clipboardText, file: [] });
    if (source && source.kind !== "file") {
      setValue("url", clipboardText.trim());
    }
  }, [clipboardText]);

  const source = tryGetSource(values);
  const sourcePlatform = source ? getSourcePlatform(source) : undefined;

  // Remember every device seen, so a chosen device that disconnects stays chosen (shown as unavailable) instead of
  // the form switching to another one.
  const knownDevicesRef = useRef(new Map<string, Device>(props.device ? [[props.device.id, props.device]] : []));
  for (const device of devices) knownDevicesRef.current.set(device.id, device);

  // Preselect a device only while none is chosen. Choosing an .apk or .ipa for the other platform switches to a
  // matching device, unless the form opened for a specific device; launching then explains the mismatch.
  useEffect(() => {
    if (devices.length === 0 || organization.isLoading) return;
    if (values.deviceId) {
      const current = devices.find((device) => device.id === values.deviceId);
      if (!current || props.device || !sourcePlatform || current.platform === sourcePlatform) return;
    }
    const next = pickDefaultDevice(visibleDevices, organization.pinnedKeys, lastDeviceId, sourcePlatform);
    if (next && next.id !== values.deviceId) {
      setValue("deviceId", next.id);
    }
  }, [devices, sourcePlatform, organization.isLoading]);

  const selectedDevice = devices.find((device) => device.id === values.deviceId);
  const unavailableDevice = selectedDevice ? undefined : knownDevicesRef.current.get(values.deviceId);

  return (
    <Form
      isLoading={(isLoading && !data) || organization.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Launch" icon={Icon.Play} onSubmit={handleSubmit} />
          <Action
            title="Open in Expo Orbit"
            icon={Icon.AppWindow}
            onAction={async () => {
              const handOff = tryGetSource(values);
              if (!handOff) {
                await showFailureToast(new Error("Enter a URL or choose a file first."), {
                  title: "Nothing to Open",
                });
                return;
              }
              try {
                await openInOrbitApp(handOff, selectedDevice);
              } catch (openError) {
                await showFailureToast(openError, {
                  title: "Couldn't Open Expo Orbit",
                  primaryAction:
                    openError instanceof OrbitNotInstalledError
                      ? { title: "Get Expo Orbit", onAction: () => open(ORBIT_DOWNLOAD_URL) }
                      : undefined,
                });
              }
            }}
          />
          <Action
            title="Refresh Devices"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    >
      {error ? (
        <Form.Description
          title="Devices"
          text={
            error instanceof OrbitNotInstalledError
              ? "Expo Orbit isn't installed. Download it from expo.dev/orbit, then try again."
              : `Couldn't load devices: ${error.message}`
          }
        />
      ) : null}
      <Form.TextField
        {...itemProps.url}
        title="URL"
        placeholder="https://expo.dev/artifacts/… or exp://u.expo.dev/…"
        info="An EAS Build install link, an EAS Update or Snack link, an expo-orbit:// link, or the path of an app file."
      />
      <Form.FilePicker
        {...itemProps.file}
        title="Or App File"
        allowMultipleSelection={false}
        canChooseDirectories
        info="An .apk, .app, .ipa, or .tar.gz file. Takes the place of the URL."
      />
      {source ? <Form.Description text={SOURCE_DESCRIPTIONS[source.kind]} /> : null}
      <Form.Separator />
      <Form.Dropdown {...itemProps.deviceId} title="Device" placeholder="Choose a device">
        {getDeviceGroups(visibleDevices, organization).map((group) => (
          <Form.Dropdown.Section key={group.title} title={group.title}>
            {group.devices.map((device) => (
              <Form.Dropdown.Item
                key={`${device.osType}-${device.id}`}
                value={device.id}
                title={getDeviceOptionTitle(device)}
                icon={getDeviceIcon(device)}
                keywords={[device.osType, device.kind, device.id]}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
        {unavailableDevice ? (
          <Form.Dropdown.Section title="Unavailable">
            <Form.Dropdown.Item
              value={unavailableDevice.id}
              title={`${unavailableDevice.name} — Not Available`}
              icon={getDeviceIcon(unavailableDevice)}
            />
          </Form.Dropdown.Section>
        ) : null}
      </Form.Dropdown>
    </Form>
  );
}
