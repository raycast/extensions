import {
  Alert,
  Color,
  Icon,
  LocalStorage,
  MenuBarExtra,
  Toast,
  confirmAlert,
  environment,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  NightWatchError,
  forceRestoreSleep,
  getNightWatchStatus,
  toggleNightWatch,
} from "./night-watch";
import { NightWatchStatus } from "./status";
import { createSingleFlight, shouldToggleFromMenuBar } from "./menu-bar-click";

const OFF_ICON = { source: "coffee-off.png", tintColor: Color.PrimaryText };
const ON_ICON = { source: "coffee-on.png", tintColor: Color.PrimaryText };
const ACTIVATED_KEY = "menu-bar-direct-toggle-activated-v1";
const runLaunchOnce = createSingleFlight<NightWatchStatus>();

async function showToggleSuccess(result: "on" | "off"): Promise<void> {
  await showToast({
    style: Toast.Style.Success,
    title:
      result === "on"
        ? "☕ Agent Night Watch Enabled"
        : "Agent Night Watch Disabled",
  });
}

async function showActionFailure(error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Action Not Completed",
    message: error instanceof NightWatchError ? error.message : String(error),
  });
}

export default function Command() {
  const [status, setStatus] = useState<NightWatchStatus>();
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const nextStatus = await getNightWatchStatus();
    setStatus(nextStatus);
    return nextStatus;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const executeLaunch = async (): Promise<NightWatchStatus> => {
      let current = await getNightWatchStatus();
      const alreadyActivated =
        (await LocalStorage.getItem<boolean>(ACTIVATED_KEY)) === true;
      if (!alreadyActivated) {
        await LocalStorage.setItem(ACTIVATED_KEY, true);
      } else if (
        shouldToggleFromMenuBar(
          environment.launchType,
          alreadyActivated,
          current.kind,
        )
      ) {
        const result = await toggleNightWatch();
        await showToggleSuccess(result);
        current = await getNightWatchStatus();
      }
      return current;
    };

    setIsLoading(true);
    void runLaunchOnce(executeLaunch)
      .then((current) => {
        if (!cancelled) setStatus(current);
      })
      .catch(async (error) => {
        await showActionFailure(error);
        if (!cancelled) setStatus(await getNightWatchStatus());
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const restoreExternalState = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Restore Normal System Sleep?",
      message:
        "The current sleep-disabled state is not owned by Agent Night Watch. Continuing runs pmset disablesleep 0 and may override another tool.",
      primaryAction: {
        title: "Restore Normal Sleep",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await forceRestoreSleep();
      await showToast({
        style: Toast.Style.Success,
        title: "Normal System Sleep Restored",
      });
    } catch (error) {
      await showActionFailure(error);
    } finally {
      await refresh();
      setIsLoading(false);
    }
  }, [refresh]);

  const isOn = status?.sleepDisabled ?? false;
  const isTransitioning =
    status?.kind === "starting" || status?.kind === "stopping";
  const tooltip = status
    ? `Agent Night Watch: ${status.message}. Click to toggle.`
    : "Reading Agent Night Watch status";

  return (
    <MenuBarExtra
      icon={isOn ? ON_ICON : OFF_ICON}
      isLoading={isLoading || isTransitioning}
      tooltip={tooltip}
    >
      {status?.kind === "on-external" ? (
        <>
          <MenuBarExtra.Item
            title={`Status: ${status.message}`}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          />
          <MenuBarExtra.Item
            title="Restore Normal Sleep…"
            subtitle="Overrides another tool or leftover state"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            onAction={() => void restoreExternalState()}
          />
          <MenuBarExtra.Item
            title="Refresh Status"
            icon={Icon.ArrowClockwise}
            onAction={() => void refresh()}
          />
        </>
      ) : null}

      {isTransitioning ? (
        <MenuBarExtra.Item title={status.message} icon={Icon.Clock} />
      ) : null}
    </MenuBarExtra>
  );
}
