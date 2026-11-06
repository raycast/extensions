import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  LaunchType,
  List,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openCommand } from "./lib/launch";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboard, restorePrevious } from "./lib/automation";
import type { DeviceStatus } from "./lib/automation";
import { getRoutines } from "./lib/routine-store";
import type { Routine } from "./lib/routines";
import { describeRokuError } from "./lib/roku";
import { selectDevice } from "./lib/storage";
import type { RokuDevice } from "./lib/types";
import { ConnectionHelp } from "./components/ConnectionHelp";
import { RoutineRunner } from "./components/routineRunner";

/** `navigationTitle` is only passed when pushed; as a command root, Raycast shows the command title. */
export default function TVDashboard({ navigationTitle }: { navigationTitle?: string } = {}) {
  const [statuses, setStatuses] = useState<DeviceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [checkedAt, setCheckedAt] = useState<Date>();
  const generation = useRef(0);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setIsLoading(true);
    setError(undefined);
    try {
      const found = await getDashboard();
      if (current !== generation.current) return;
      setStatuses(found);
      setCheckedAt(new Date());
    } catch (cause) {
      if (current === generation.current) setError(describeRokuError(cause));
    } finally {
      if (current === generation.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      generation.current += 1;
    };
  }, [refresh]);

  async function open(device: RokuDevice, command: "roku-remote" | "launch-app") {
    try {
      await selectDevice(device.id);
      await launchCommand({ name: command, type: LaunchType.UserInitiated });
    } catch (cause) {
      await showFailureToast(describeRokuError(cause), { title: "Couldn't open TV controls" });
    }
  }

  async function restore(device: RokuDevice) {
    if (busy.current) return;
    busy.current = true;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Restoring previous app or input…",
      message: device.name,
    });
    try {
      const result = await restorePrevious(device);
      toast.style = Toast.Style.Success;
      toast.title = result.confirmed ? "Previous app or input restored" : "Restore command sent";
      toast.message = result.message;
      await refresh();
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't restore previous app or input";
      toast.message = describeRokuError(cause);
    } finally {
      busy.current = false;
    }
  }

  const refreshAction = (
    <Action
      title="Refresh TV Status"
      icon={Icon.ArrowClockwise}
      onAction={refresh}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search saved TVs…"
    >
      <List.EmptyView
        icon={Icon.Desktop}
        title={error ? "Couldn't load TV status" : isLoading ? "Checking saved TVs…" : "No TVs are saved"}
        description={error ?? "Add a TV in Manage Roku TVs, then refresh this dashboard."}
        actions={
          <ActionPanel>
            {refreshAction}
            <Action title="Manage TVs" icon={Icon.Gear} onAction={() => openCommand("manage-devices")} />
          </ActionPanel>
        }
      />
      {error && statuses.length ? (
        <List.Section title="Refresh">
          <List.Item
            title="Couldn't refresh TV status"
            subtitle={error}
            icon={Icon.ExclamationMark}
            actions={<ActionPanel>{refreshAction}</ActionPanel>}
          />
        </List.Section>
      ) : null}
      <List.Section
        title="Saved TVs"
        subtitle={
          checkedAt
            ? `Checked at ${checkedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · Refresh for current status`
            : undefined
        }
      >
        {statuses.map((status) => {
          const device = status.device;
          const mode = status.controlMode ?? device.controlMode;
          const restricted = mode?.toLowerCase() === "limited" || mode?.toLowerCase() === "disabled";
          const power = status.powerMode ?? device.powerMode;
          const powerLabel =
            power === "PowerOn" ? "On" : power && /ready|standby|suspend/i.test(power) ? "Standby" : "Unknown";
          return (
            <List.Item
              key={device.id}
              title={device.name}
              // The detail pane hides accessories, so reachability is in the subtitle and icon tint.
              subtitle={[
                status.reachable ? status.activeApp?.name || "Reachable" : "Unreachable",
                restricted ? "Limited control" : undefined,
              ]
                .filter(Boolean)
                .join(" · ")}
              keywords={[device.host, device.model ?? ""]}
              icon={{
                source: Icon.Desktop,
                tintColor: !status.reachable ? Color.SecondaryText : restricted ? Color.Orange : Color.Green,
              }}
              detail={
                <List.Item.Detail
                  markdown={
                    status.error ??
                    (restricted
                      ? "This Roku is reachable, but network control is restricted. Choose Enable Network Control for the settings path."
                      : status.reachable
                        ? "Status is checked when this dashboard opens or when you refresh. Opening the dashboard doesn't send any control commands."
                        : "The saved TV is currently unreachable. It may be in standby or on a different network.")
                  }
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="TV" text={device.name} />
                      <List.Item.Detail.Metadata.Label title="Address" text={device.host} />
                      <List.Item.Detail.Metadata.Label title="Model" text={device.model ?? "Unknown"} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Reachability"
                        text={status.reachable ? "Reachable" : "Unreachable"}
                      />
                      <List.Item.Detail.Metadata.Label title="Power" text={powerLabel} />
                      <List.Item.Detail.Metadata.Label
                        title="Active App or Input"
                        text={status.activeApp?.name ?? "Not available"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Network Control"
                        text={mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : "Unknown"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action title="Open Remote" icon={Icon.Keyboard} onAction={() => open(device, "roku-remote")} />
                  <Action
                    title="Open Apps and Inputs"
                    icon={Icon.AppWindow}
                    onAction={() => open(device, "launch-app")}
                  />
                  <Action.Push title="Run a Routine" icon={Icon.Play} target={<DeviceRoutines device={device} />} />
                  <Action
                    title="Restore Previous App or Input"
                    icon={Icon.ArrowCounterClockwise}
                    onAction={() => restore(device)}
                  />
                  <Action
                    title="Use as Default TV"
                    icon={Icon.Checkmark}
                    onAction={async () => {
                      try {
                        await selectDevice(device.id);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Default TV selected",
                          message: device.name,
                        });
                      } catch (cause) {
                        await showFailureToast(describeRokuError(cause), { title: "Couldn't select TV" });
                      }
                    }}
                  />
                  {refreshAction}
                  <Action.Push
                    title={restricted ? "Enable Network Control" : "Connection Help"}
                    icon={Icon.Info}
                    target={<ConnectionHelp device={device} message={status.error} />}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function DeviceRoutines({ device }: { device: RokuDevice }) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  useEffect(() => {
    let mounted = true;
    void getRoutines()
      .then((saved) => {
        if (mounted) setRoutines(saved.filter((routine) => routine.deviceId === device.id));
      })
      .catch((cause) => {
        if (mounted) setError(describeRokuError(cause));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [device.id]);
  return (
    <List isLoading={isLoading} navigationTitle={`${device.name} · Routines`} searchBarPlaceholder="Choose a routine…">
      <List.EmptyView
        icon={Icon.List}
        title={error ? "Couldn't load routines" : "No routines for this TV"}
        description={error ?? "Create a routine in Roku Routines and choose this TV."}
        actions={
          <ActionPanel>
            <Action title="Open Roku Routines" icon={Icon.Plus} onAction={() => openCommand("roku-routines")} />
          </ActionPanel>
        }
      />
      {routines.map((routine) => (
        <List.Item
          key={routine.id}
          title={routine.name}
          subtitle={routine.description}
          icon={Icon.List}
          accessories={[{ text: `${routine.steps.length} steps` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Run Routine"
                icon={Icon.Play}
                target={<RoutineRunner routine={routine} deviceName={device.name} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
