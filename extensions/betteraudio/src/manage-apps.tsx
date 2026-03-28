import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  listApps,
  setAppVolume,
  muteApp,
  soloApp,
  setAppEQ,
  setAppDevice,
  listDevices,
} from "./lib/cli";
import { EQ_PRESETS, VOLUME_STEPS } from "./lib/constants";
import { ErrorView } from "./components/ErrorView";
import type { CLIAppInfo } from "./lib/types";

export default function Command() {
  const {
    data: apps,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(listApps);

  if (error) return <ErrorView error={error} />;

  if (!isLoading && (!apps || apps.length === 0)) {
    return (
      <List>
        <List.EmptyView
          title="No Apps Playing Audio"
          description="Apps will appear here when they start playing audio."
          icon={Icon.SpeakerOff}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search apps...">
      {apps?.map((app) => (
        <AppItem key={app.id} app={app} revalidate={revalidate} />
      ))}
    </List>
  );
}

function AppItem({
  app,
  revalidate,
}: {
  app: CLIAppInfo;
  revalidate: () => void;
}) {
  const volumePercent = Math.round(app.volume);
  const accessories: List.Item.Accessory[] = [];

  if (app.isMuted) {
    accessories.push({ tag: { value: "Muted", color: Color.Red } });
  }
  if (app.eqPreset && app.eqPreset !== "flat") {
    accessories.push({
      tag: { value: `EQ: ${app.eqPreset}`, color: Color.Blue },
    });
  }
  if (app.deviceUID && app.deviceUID !== "default") {
    accessories.push({ text: `→ ${app.deviceName ?? app.deviceUID}` });
  }
  accessories.push({ text: `${volumePercent}%` });

  return (
    <List.Item
      title={app.name}
      subtitle={app.bundleID ?? app.id}
      icon={
        app.bundleID
          ? { fileIcon: `/Applications/${app.name}.app` }
          : Icon.SpeakerHigh
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Volume">
            <ActionPanel.Submenu title="Set Volume" icon={Icon.SpeakerHigh}>
              {VOLUME_STEPS.map((step) => (
                <Action
                  key={step}
                  title={`${step}%`}
                  icon={volumePercent === step ? Icon.CheckCircle : Icon.Circle}
                  onAction={async () => {
                    try {
                      await setAppVolume(app.id, step);
                      await showToast({
                        style: Toast.Style.Success,
                        title: `${app.name}: ${step}%`,
                      });
                      revalidate();
                    } catch (err) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed",
                        message:
                          err instanceof Error ? err.message : String(err),
                      });
                    }
                  }}
                />
              ))}
            </ActionPanel.Submenu>
            <Action
              title={app.isMuted ? "Unmute" : "Mute"}
              icon={app.isMuted ? Icon.SpeakerHigh : Icon.SpeakerOff}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={async () => {
                try {
                  const muted = await muteApp(app.id, "toggle");
                  await showToast({
                    style: Toast.Style.Success,
                    title: `${app.name}: ${muted ? "Muted" : "Unmuted"}`,
                  });
                  revalidate();
                } catch (err) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed",
                    message: err instanceof Error ? err.message : String(err),
                  });
                }
              }}
            />
            <Action
              title="Solo"
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                try {
                  await soloApp(app.id);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Solo: ${app.name}`,
                  });
                  revalidate();
                } catch (err) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed",
                    message: err instanceof Error ? err.message : String(err),
                  });
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="EQ">
            <ActionPanel.Submenu title="Set EQ Preset" icon={Icon.BarChart}>
              {EQ_PRESETS.map((preset) => (
                <Action
                  key={preset.value}
                  title={preset.title}
                  icon={
                    app.eqPreset === preset.value
                      ? Icon.CheckCircle
                      : Icon.Circle
                  }
                  onAction={async () => {
                    try {
                      await setAppEQ(app.id, preset.value);
                      await showToast({
                        style: Toast.Style.Success,
                        title: `${app.name} EQ: ${preset.title}`,
                      });
                      revalidate();
                    } catch (err) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed",
                        message:
                          err instanceof Error ? err.message : String(err),
                      });
                    }
                  }}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>

          <ActionPanel.Section title="Routing">
            <SetDeviceAction app={app} revalidate={revalidate} />
            {app.deviceUID && app.deviceUID !== "default" && (
              <Action
                title="Reset to Default Device"
                icon={Icon.ArrowCounterClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={async () => {
                  try {
                    await setAppDevice(app.id, "default");
                    await showToast({
                      style: Toast.Style.Success,
                      title: `${app.name}: Default device`,
                    });
                    revalidate();
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed",
                      message: err instanceof Error ? err.message : String(err),
                    });
                  }
                }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Copy Bundle ID"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(app.bundleID ?? app.id);
                await showHUD("📋 Copied");
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SetDeviceAction({
  app,
  revalidate,
}: {
  app: CLIAppInfo;
  revalidate: () => void;
}) {
  return (
    <ActionPanel.Submenu title="Route to Device" icon={Icon.Switch}>
      <Action
        title="Default"
        icon={
          !app.deviceUID || app.deviceUID === "default"
            ? Icon.CheckCircle
            : Icon.Circle
        }
        onAction={async () => {
          try {
            await setAppDevice(app.id, "default");
            await showToast({
              style: Toast.Style.Success,
              title: `${app.name}: Default device`,
            });
            revalidate();
          } catch (err) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed",
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }}
      />
      <DeviceListForRouting app={app} revalidate={revalidate} />
    </ActionPanel.Submenu>
  );
}

function DeviceListForRouting({
  app,
  revalidate,
}: {
  app: CLIAppInfo;
  revalidate: () => void;
}) {
  const { data: devices } = useCachedPromise(async () => listDevices("output"));
  const outputDevices = devices ?? [];

  return (
    <>
      {outputDevices.map((device) => (
        <Action
          key={device.uid}
          title={device.name}
          icon={app.deviceUID === device.uid ? Icon.CheckCircle : Icon.Circle}
          onAction={async () => {
            try {
              await setAppDevice(app.id, device.uid);
              await showToast({
                style: Toast.Style.Success,
                title: `${app.name} → ${device.name}`,
              });
              revalidate();
            } catch (err) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed",
                message: err instanceof Error ? err.message : String(err),
              });
            }
          }}
        />
      ))}
    </>
  );
}
