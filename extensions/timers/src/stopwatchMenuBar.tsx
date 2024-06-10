import { Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useEffect } from "react";
import useStopwatches from "./hooks/useStopwatches";
import { formatTime } from "./backend/formatUtils";
import { Preferences, Stopwatch } from "./backend/types";
import { formatMenuBarIcon, formatMenuBarTitle } from "./backend/menuBarUtils";
import { shortCircuitMenuBar } from "./backend/utils";

export default function Command() {
  const { stopwatches, isLoading, refreshSWes, handlePauseSW, handleStartSW, handleStopSW, handleUnpauseSW } =
    useStopwatches();
  useEffect(() => {
    refreshSWes();
    setInterval(() => {
      refreshSWes();
    }, 1000);
  }, []);

  if (isLoading) {
    refreshSWes();
  }
  const prefs = getPreferenceValues<Preferences>();
  if (shortCircuitMenuBar<Stopwatch>(stopwatches, prefs)) return null;

  const swTitleSuffix = (sw: Stopwatch) => {
    return sw.lastPaused === "----" ? " elapsed" : " (paused)";
  };

  return (
    <MenuBarExtra
      icon={formatMenuBarIcon<Stopwatch>(stopwatches, prefs, Icon.Stopwatch)}
      isLoading={isLoading}
      title={formatMenuBarTitle<Stopwatch>(stopwatches, prefs)}
    >
      <MenuBarExtra.Item title="Click running stopwatch to pause" />
      {stopwatches?.map((sw) => (
        <MenuBarExtra.Item
          title={sw.name + ": " + formatTime(sw.timeElapsed) + swTitleSuffix(sw)}
          key={sw.swID}
          onAction={() => (sw.lastPaused === "----" ? handlePauseSW(sw.swID) : handleUnpauseSW(sw.swID))}
        />
      ))}
      <MenuBarExtra.Section>
        {stopwatches?.map((sw) => (
          <MenuBarExtra.Item title={`Delete "${sw.name}"`} key={sw.swID} onAction={() => handleStopSW(sw)} />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Start New Stopwatch"
          onAction={() => handleStartSW({ launchedFromMenuBar: true })}
          key="startSW"
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
