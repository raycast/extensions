import { Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useEffect } from "react";
import useStopwatches from "./hooks/useStopwatches";
import { formatTime } from "./formatUtils";
import { Preferences } from "./types";

export default function Command() {
  const { stopwatches, isLoading, refreshSWes, handlePauseSW, handleStartSW } = useStopwatches();
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
  if (
    (stopwatches == undefined || stopwatches.length == 0 || stopwatches.length == undefined) &&
    prefs.showMenuBarItemWhen !== "always"
  ) {
    return null;
  }

  const getSWMenuBarTitle = () => {
    if (stopwatches === undefined || stopwatches?.length === 0 || stopwatches.length == undefined) {
      return undefined;
    } else if (prefs.showTitleInMenuBar) {
      return `${stopwatches[0].name}: ~${formatTime(stopwatches[0].timeElapsed)}`;
    } else {
      return `~${formatTime(stopwatches[0].timeElapsed)}`;
    }
  };

  return (
    <MenuBarExtra
      icon={prefs.showMenuBarItemWhen !== "never" ? Icon.Stopwatch : undefined}
      isLoading={isLoading}
      title={getSWMenuBarTitle()}
    >
      <MenuBarExtra.Item title="Click running stopwatch to pause" />
      {stopwatches?.map((sw) => (
        <MenuBarExtra.Item
          title={sw.name + ": " + formatTime(sw.timeElapsed) + " elapsed"}
          key={sw.swID}
          onAction={() => handlePauseSW(sw.swID)}
        />
      ))}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Start Stopwatch" onAction={() => handleStartSW()} key="startSW" />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
