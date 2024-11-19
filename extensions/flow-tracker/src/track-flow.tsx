import { useEffect } from "react";
import { MenuBarExtra, openCommandPreferences, Icon } from "@raycast/api";
import { useFocusTracking } from "./hooks/useFocusTracking";
import { formatTime } from "./utils/formatters";
import { FlowProvider } from "./contexts/FlowContext";

export default function TrackFlowPage() {
  const { isTracking, focusLog, personalBest, startTracking, stopTracking, resetLogs } = useFocusTracking();

  useEffect(() => {
    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, []);

  return (
    <FlowProvider>
      <MenuBarExtra icon={isTracking ? Icon.CircleFilled : Icon.Circle}>
        <MenuBarExtra.Item
          icon={isTracking ? Icon.Stop : Icon.Play}
          title={isTracking ? "Stop Flow" : "Start Flow"}
          onAction={isTracking ? stopTracking : startTracking}
        />
        <MenuBarExtra.Section />
        {focusLog && (
          <>
            <MenuBarExtra.Item title={`Total Time: ${formatTime(focusLog.totalTime)}`} icon={Icon.Clock} />

            {personalBest && (
              <MenuBarExtra.Item title={`Personal Best: ${formatTime(personalBest)}`} icon={Icon.Star} />
            )}

            <MenuBarExtra.Section />
          </>
        )}

        <MenuBarExtra.Item title="Reset Logs" icon={Icon.Trash} onAction={resetLogs} />

        <MenuBarExtra.Item title="Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra>
    </FlowProvider>
  );
}
