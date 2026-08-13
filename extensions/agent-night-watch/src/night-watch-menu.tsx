import {
  Alert,
  Color,
  Icon,
  MenuBarExtra,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  NightWatchError,
  forceRestoreSleep,
  getNightWatchStatus,
  startNightWatch,
  stopNightWatch,
} from "./night-watch";
import { NightWatchStatus } from "./status";

const OFF_ICON = { source: "coffee-off.png", tintColor: Color.PrimaryText };
const ON_ICON = { source: "coffee-on.png", tintColor: Color.PrimaryText };

export default function Command() {
  const [status, setStatus] = useState<NightWatchStatus>();
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getNightWatchStatus());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (operation: () => Promise<void>, successTitle: string) => {
      setIsLoading(true);
      try {
        await operation();
        await showToast({ style: Toast.Style.Success, title: successTitle });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Action Not Completed",
          message:
            error instanceof NightWatchError ? error.message : String(error),
        });
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  const isOn = status?.sleepDisabled ?? false;
  const isTransitioning =
    status?.kind === "starting" || status?.kind === "stopping";
  const tooltip = status
    ? `Agent Night Watch: ${status.message}`
    : "Reading Agent Night Watch status";

  return (
    <MenuBarExtra
      icon={isOn ? ON_ICON : OFF_ICON}
      isLoading={isLoading || isTransitioning}
      tooltip={tooltip}
    >
      <MenuBarExtra.Item
        title={`Status: ${status?.message ?? "Reading…"}`}
        icon={isOn ? ON_ICON : OFF_ICON}
      />
      <MenuBarExtra.Separator />

      {status?.kind === "off" ? (
        <MenuBarExtra.Item
          title="Enable Agent Night Watch"
          subtitle="Requires administrator authorization"
          icon={ON_ICON}
          onAction={() =>
            void run(startNightWatch, "☕ Agent Night Watch Enabled")
          }
        />
      ) : null}

      {status?.kind === "on-owned" ? (
        <MenuBarExtra.Item
          title="Disable Agent Night Watch"
          subtitle="Restore normal closed-lid sleep"
          icon={OFF_ICON}
          onAction={() =>
            void run(stopNightWatch, "Agent Night Watch Disabled")
          }
        />
      ) : null}

      {status?.kind === "on-external" ? (
        <MenuBarExtra.Item
          title="Restore Normal Sleep…"
          subtitle="Overrides another tool or leftover state"
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Restore Normal System Sleep?",
              message:
                "The current sleep-disabled state is not owned by Agent Night Watch. Continuing runs pmset disablesleep 0 and may override another tool.",
              primaryAction: {
                title: "Restore Normal Sleep",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (confirmed)
              await run(forceRestoreSleep, "Normal System Sleep Restored");
          }}
        />
      ) : null}

      {isTransitioning ? (
        <MenuBarExtra.Item title={status.message} icon={Icon.Clock} />
      ) : null}

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Refresh Status"
        icon={Icon.ArrowClockwise}
        onAction={() => void refresh()}
      />
    </MenuBarExtra>
  );
}
