import { Icon, MenuBarExtra, launchCommand, LaunchType } from "@raycast/api";
import { useEffect } from "react";
import useTimers from "./hooks/useTimers";
import { formatTime } from "./formatUtils";

export default function Command() {
  const { timers, customTimers, isLoading, refreshTimers, handleStartTimer, handleStopTimer, handleStartCT } =
    useTimers();
  useEffect(() => {
    refreshTimers();
    setInterval(() => {
      refreshTimers();
    }, 1000);
  }, []);

  return (
    <MenuBarExtra
      icon={Icon.Clock}
      isLoading={isLoading}
      title={
        timers != undefined && timers?.length > 0 ? `${timers[0].name}: ~${formatTime(timers[0].timeLeft)}` : undefined
      }
    >
      <MenuBarExtra.Item title="Click running timer to stop" />
      {timers?.map((timer) => (
        <MenuBarExtra.Item
          title={timer.name + ": " + formatTime(timer.timeLeft) + " left"}
          key={timer.originalFile}
          onAction={() => handleStopTimer(timer)}
        />
      ))}

      <MenuBarExtra.Separator />
      {Object.keys(customTimers)
        ?.sort((a, b) => {
          return customTimers[a].timeInSeconds - customTimers[b].timeInSeconds;
        })
        .map((ctID) => (
          <MenuBarExtra.Item
            title={'Start "' + customTimers[ctID].name + '"'}
            key={ctID}
            onAction={() => handleStartCT(customTimers[ctID])}
          />
        ))}

      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Start 2 Minute Timer"
        onAction={() => handleStartTimer(60 * 2, "2 Minute Timer")}
        key="2M"
      />
      <MenuBarExtra.Item
        title="Start 5 Minute Timer"
        onAction={() => handleStartTimer(60 * 5, "5 Minute Timer")}
        key="5M"
      />
      <MenuBarExtra.Item
        title="Start 10 Minute Timer"
        onAction={() => handleStartTimer(60 * 10, "10 Minute Timer")}
        key="10M"
      />
      <MenuBarExtra.Item
        title="Start 15 Minute Timer"
        onAction={() => handleStartTimer(60 * 15, "15 Minute Timer")}
        key="15M"
      />
      <MenuBarExtra.Item
        title="Start 30 Minute Timer"
        onAction={() => handleStartTimer(60 * 30, "30 Minute Timer")}
        key="30M"
      />
      <MenuBarExtra.Item
        title="Start 45 Minute Timer"
        onAction={() => handleStartTimer(60 * 45, "45 Minute Timer")}
        key="45M"
      />
      <MenuBarExtra.Item
        title="Start 60 Minute Timer"
        onAction={() => handleStartTimer(60 * 60, "60 Minute Timer")}
        key="60M"
      />
      <MenuBarExtra.Item
        title="Start 90 Minute Timer"
        onAction={() => handleStartTimer(60 * 60 * 1.5, "90 Minute Timer")}
        key="90M"
      />

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
