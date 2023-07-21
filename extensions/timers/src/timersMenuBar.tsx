import { Icon, MenuBarExtra, launchCommand, LaunchType, getPreferenceValues } from "@raycast/api";
import { useEffect } from "react";
import useTimers from "./hooks/useTimers";
import { formatTime } from "./formatUtils";
import { Preferences } from "./types";

export default function Command() {
  const { timers, customTimers, isLoading, refreshTimers, handleStartTimer, handleStopTimer, handleStartCT } =
    useTimers();
  useEffect(() => {
    refreshTimers();
    setInterval(() => {
      refreshTimers();
    }, 1000);
  }, []);

  if (isLoading) {
    refreshTimers();
  }
  const prefs = getPreferenceValues<Preferences>();
  if (
    (timers == undefined || timers.length == 0 || timers.length == undefined) &&
    prefs.showMenuBarItemWhen !== "always"
  ) {
    return null;
  }

  const getTimerMenuBarTitle = () => {
    if (timers === undefined || timers?.length === 0 || timers.length == undefined) {
      return undefined;
    } else if (prefs.showTitleInMenuBar) {
      return `${timers[0].name}: ~${formatTime(timers[0].timeLeft)}`;
    } else {
      return `~${formatTime(timers[0].timeLeft)}`;
    }
  };

  return (
    <MenuBarExtra
      icon={prefs.showMenuBarItemWhen !== "never" ? Icon.Clock : undefined}
      isLoading={isLoading}
      title={getTimerMenuBarTitle()}
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
          .map((ctID) => (
            <MenuBarExtra.Item
              title={'Start "' + customTimers[ctID].name + '"'}
              key={ctID}
              onAction={() => handleStartCT(customTimers[ctID], true)}
            />
          ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Start 2 Minute Timer"
          onAction={() => handleStartTimer(60 * 2, "2 Minute Timer", true)}
          key="2M"
        />
        <MenuBarExtra.Item
          title="Start 5 Minute Timer"
          onAction={() => handleStartTimer(60 * 5, "5 Minute Timer", true)}
          key="5M"
        />
        <MenuBarExtra.Item
          title="Start 10 Minute Timer"
          onAction={() => handleStartTimer(60 * 10, "10 Minute Timer", true)}
          key="10M"
        />
        <MenuBarExtra.Item
          title="Start 15 Minute Timer"
          onAction={() => handleStartTimer(60 * 15, "15 Minute Timer", true)}
          key="15M"
        />
        <MenuBarExtra.Item
          title="Start 30 Minute Timer"
          onAction={() => handleStartTimer(60 * 30, "30 Minute Timer", true)}
          key="30M"
        />
        <MenuBarExtra.Item
          title="Start 45 Minute Timer"
          onAction={() => handleStartTimer(60 * 45, "45 Minute Timer", true)}
          key="45M"
        />
        <MenuBarExtra.Item
          title="Start 60 Minute Timer"
          onAction={() => handleStartTimer(60 * 60, "60 Minute Timer", true)}
          key="60M"
        />
        <MenuBarExtra.Item
          title="Start 90 Minute Timer"
          onAction={() => handleStartTimer(60 * 60 * 1.5, "90 Minute Timer", true)}
          key="90M"
        />
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
