import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ReactElement, useEffect } from "react";
import {
  DaemonNotRunningError,
  Fan,
  FanProfile,
  INSTALL_DAEMON_COMMAND,
  INSTALL_SMCTL_COMMAND,
  SmctlNotFoundError,
  formatRPM,
  getFanSnapshot,
  setFanProfile,
} from "./lib/smctl";
import { SetFanSpeedForm } from "./set-speed-form";

const REFRESH_INTERVAL_MS = 3_000;

function modeAccessory(fan: Fan): List.Item.Accessory {
  const isManual = fan.mode === "manual";
  return {
    tag: {
      value: isManual ? "Manual" : "Auto",
      color: isManual ? Color.Orange : Color.Green,
    },
    tooltip: `Control mode: ${fan.mode}`,
  };
}

async function applyProfile(
  profile: FanProfile,
  revalidate: () => void,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Applying "${profile}" profile…`,
  });
  try {
    await setFanProfile(profile);
    toast.style = Toast.Style.Success;
    toast.title =
      profile === "auto"
        ? "Fans returned to macOS control"
        : `Profile "${profile}" applied`;
    revalidate();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to apply profile";
    toast.message = error instanceof Error ? error.message : String(error);
    if (error instanceof DaemonNotRunningError) {
      toast.primaryAction = {
        title: "Copy Install Command",
        onAction: () => Clipboard.copy(INSTALL_DAEMON_COMMAND),
      };
    }
  }
}

function ErrorView(props: { error: Error }): ReactElement {
  const { error } = props;
  const isMissingBinary = error instanceof SmctlNotFoundError;
  const command = isMissingBinary
    ? INSTALL_SMCTL_COMMAND
    : INSTALL_DAEMON_COMMAND;
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title={
        isMissingBinary ? "smctl is not installed" : "Something went wrong"
      }
      description={`${error.message}\n\nRun in a terminal: ${command}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={command}
          />
          <Action.OpenInBrowser
            title="Open Smctl on GitHub"
            url="https://github.com/leaperone/smctl"
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command(): ReactElement {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    getFanSnapshot,
    [],
    {
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    const id = setInterval(revalidate, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [revalidate]);

  const profileActions = (
    <ActionPanel.Section title="Profiles">
      <Action
        title="Set Fans to Auto"
        icon={Icon.Leaf}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        onAction={() => applyProfile("auto", revalidate)}
      />
      <Action
        title="Quiet Profile"
        icon={Icon.SpeakerOff}
        shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
        onAction={() => applyProfile("quiet", revalidate)}
      />
      <Action
        title="Full Speed"
        icon={Icon.Bolt}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
        onAction={() => applyProfile("full", revalidate)}
      />
    </ActionPanel.Section>
  );

  const hottest = data?.hottestSensorCelsius;
  const subtitle =
    hottest === undefined
      ? undefined
      : `Hottest sensor: ${hottest.toFixed(1)} °C`;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Fan Control"
      searchBarPlaceholder="Filter fans…"
    >
      {error ? (
        <ErrorView error={error} />
      ) : (
        <List.Section title="Fans" subtitle={subtitle}>
          {data?.fans.map((fan) => (
            <List.Item
              key={fan.index}
              icon={{
                source: Icon.Gauge,
                tintColor: fan.mode === "manual" ? Color.Orange : Color.Green,
              }}
              title={`Fan ${fan.index + 1}`}
              subtitle={formatRPM(fan.actualRPM)}
              accessories={[
                {
                  text: `target ${formatRPM(fan.targetRPM)}`,
                  tooltip: "Target RPM",
                },
                {
                  text: `${fan.minimumRPM}–${fan.maximumRPM}`,
                  tooltip: "Supported RPM range",
                },
                modeAccessory(fan),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Manual Control">
                    <Action.Push
                      title="Set Fan Speed…"
                      icon={Icon.Pencil}
                      target={
                        <SetFanSpeedForm
                          fans={data.fans}
                          initialFanIndex={fan.index}
                          onDone={revalidate}
                        />
                      }
                    />
                  </ActionPanel.Section>
                  {profileActions}
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
