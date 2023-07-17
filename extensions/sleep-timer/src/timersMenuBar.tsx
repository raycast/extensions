import { Icon, MenuBarExtra, launchCommand, LaunchType } from "@raycast/api";
import { useEffect } from "react";
import useTimers from "./hooks/useTimers";
import { formatTime } from "./formatUtils";

export default function Command() {
  const { timer, customTimers, isLoading, refreshTimers, handleStartTimer, handleStopTimer, handleStartCT } =
    useTimers();
  useEffect(() => {
    refreshTimers();
    setInterval(() => {
      refreshTimers();
    }, 1000);
  }, []);

  return (
    <MenuBarExtra
      icon={Icon.Moon}
      isLoading={isLoading}
      title={timer && `${timer.name}: ~${formatTime(timer.timeLeft)}`}
    >
      <MenuBarExtra.Item title="Click running sleep timer to stop" />
      {timer && (
        <MenuBarExtra.Item
          title={timer.name + ": " + formatTime(timer.timeLeft) + " left"}
          key={timer.originalFile}
          onAction={() => handleStopTimer()}
        />
      )}

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
        title="Start 15 Minute Sleep Timer"
        onAction={() => handleStartTimer(60 * 15, "15 Minute Sleep Timer")}
        key="15M"
      />
      <MenuBarExtra.Item
        title="Start 30 Minute Sleep Timer"
        onAction={() => handleStartTimer(60 * 30, "30 Minute Sleep Timer")}
        key="30M"
      />
      <MenuBarExtra.Item
        title="Start 45 Minute Sleep Timer"
        onAction={() => handleStartTimer(60 * 45, "45 Minute Sleep Timer")}
        key="45M"
      />
      <MenuBarExtra.Item
        title="Start 60 Minute Sleep Timer"
        onAction={() => handleStartTimer(60 * 60, "60 Minute Sleep Timer")}
        key="60M"
      />
      <MenuBarExtra.Item
        title="Start 90 Minute Sleep Timer"
        onAction={() => handleStartTimer(60 * 60 * 1.5, "90 Minute Sleep Timer")}
        key="90M"
      />

      <MenuBarExtra.Section title="Custom Sleep Timer">
        <MenuBarExtra.Item
          title="Start Custom Sleep Timer"
          onAction={async () => await launchCommand({ name: "startCustomTimer", type: LaunchType.UserInitiated })}
          key="custom"
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
