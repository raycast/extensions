import { Icon, MenuBarExtra, launchCommand, LaunchType, getPreferenceValues } from "@raycast/api";
import { useEffect } from "react";
import useTimers from "./hooks/useTimers";
import { formatTime } from "./backend/formatUtils";
import { Preferences, Timer } from "./backend/types";
import { formatMenuBarIcon, formatMenuBarTitle } from "./backend/menuBarUtils";
import useDefaultPresetVisibles from "./hooks/useDefaultPresetVisibles";
import { shortCircuitMenuBar } from "./backend/utils";

export default function Command() {
  const { timers, customTimers, isLoading, refreshTimers, handleStartTimer, handleStopTimer, handleStartCT } =
    useTimers();
  const { defaultPresets, defaultVisibles, refreshDefaultVisibles, isLoadingVisibles } = useDefaultPresetVisibles();

  useEffect(() => {
    refreshTimers();
    refreshDefaultVisibles();
    setInterval(() => {
      refreshTimers();
    }, 1000);
  }, []);

  if (isLoading) {
    refreshTimers();
  }
  const prefs = getPreferenceValues<Preferences>();
  if (shortCircuitMenuBar<Timer>(timers, prefs)) return null;

  return (
    <MenuBarExtra
      icon={formatMenuBarIcon(timers, prefs, Icon.Clock)}
      isLoading={isLoading && isLoadingVisibles}
      title={formatMenuBarTitle<Timer>(timers, prefs)}
    >
      <MenuBarExtra.Item title="Click running timer to stop" />
      {timers?.map((timer) => (
        <MenuBarExtra.Item
          title={timer.name + ": " + formatTime(timer.timeLeft) + " left"}
          key={timer.originalFile}
          onAction={() => handleStopTimer(timer)}
        />
      ))}

      <MenuBarExtra.Section>
        {Object.keys(customTimers)
          ?.sort((a, b) => {
            return customTimers[a].timeInSeconds - customTimers[b].timeInSeconds;
          })
          .filter((ctID) => customTimers[ctID].showInMenuBar)
          .map((ctID) => (
            <MenuBarExtra.Item
              title={'Start "' + customTimers[ctID].name + '"'}
              key={ctID}
              onAction={() => handleStartCT({ customTimer: customTimers[ctID], launchedFromMenuBar: true })}
            />
          ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        {defaultPresets
          .filter((preset) => defaultVisibles?.[preset.key])
          .map((defaultPreset) => (
            <MenuBarExtra.Item
              key={defaultPreset.key}
              title={`Start ${defaultPreset.title}`}
              onAction={() =>
                handleStartTimer({
                  timeInSeconds: defaultPreset.seconds,
                  timerName: defaultPreset.title,
                  launchedFromMenuBar: true,
                })
              }
            />
          ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Custom Timer">
        <MenuBarExtra.Item
          title="Start Custom Timer"
          onAction={async () => await launchCommand({ name: "startCustomTimer", type: LaunchType.UserInitiated })}
          key="custom"
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
