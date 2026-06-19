import { Color, LaunchProps, MenuBarExtra, getPreferenceValues, showHUD } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect, useState } from "react";
import { formatDuration, startCaffeinate, stopCaffeinate } from "./utils";

function parseEtime(etime: string): number {
  const parts = etime.split(":").reverse();
  const seconds = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;

  let hours = parts[2] ? parseInt(parts[2]) : 0;
  let days = 0;

  if (parts[2] && parts[2].includes("-")) {
    const dayHour = parts[2].split("-");
    days = parseInt(dayHour[0]) || 0;
    hours = parseInt(dayHour[1]) || 0;
  }

  return seconds + minutes * 60 + hours * 3600 + days * 86400;
}

interface CaffeinateInfo {
  isRunning: boolean;
  timeRemaining: string | null;
}

function useCaffeinateInfo(execute: boolean) {
  const { isLoading, data, mutate } = useExec("ps -o etime,args= -p $(pgrep caffeinate) 2>/dev/null", [], {
    shell: true,
    execute,
    parseOutput: (output): CaffeinateInfo => {
      const stdout = output.stdout.trim();
      if (!stdout) {
        return { isRunning: false, timeRemaining: null };
      }

      const lines = stdout.split("\n");
      const [etime, ...cmdArgs] = lines[lines.length - 1].trim().split(/\s+/);

      const secondsRunning = parseEtime(etime);
      const timeoutMatch = cmdArgs.join(" ").match(/-t (\d+)/);

      let timeRemaining: string | null = null;
      if (timeoutMatch) {
        const secondsRemain = parseInt(timeoutMatch[1]) - secondsRunning;
        if (secondsRemain > 0) {
          timeRemaining = `${formatDuration(secondsRemain)} remain`;
        }
      }

      return { isRunning: true, timeRemaining };
    },
  });

  return {
    isLoading,
    data: data ?? { isRunning: false, timeRemaining: null },
    mutate,
  };
}

export default function Command(props: LaunchProps) {
  const hasLaunchContext = props.launchContext?.caffeinated !== undefined;

  // Always execute to get time remaining info, even when we have launch context
  const { isLoading, data, mutate } = useCaffeinateInfo(true);

  // Use launch context for immediate status if available, otherwise use data from useExec
  const caffeinateStatus = hasLaunchContext ? props?.launchContext?.caffeinated : data.isRunning;
  const caffeinateLoader = hasLaunchContext ? false : isLoading;
  const preferences = getPreferenceValues<Preferences.Index>();

  const extraInfoStr = data.timeRemaining;

  const [localCaffeinateStatus, setLocalCaffeinateStatus] = useState<boolean | null>(null);
  const displayCaffeinateStatus = localCaffeinateStatus ?? caffeinateStatus;

  useEffect(() => {
    setLocalCaffeinateStatus(null);
  }, [caffeinateStatus]);

  const handleCaffeinateStatus = async () => {
    if (displayCaffeinateStatus) {
      setLocalCaffeinateStatus(false);
      await mutate(stopCaffeinate({ menubar: true, status: true }), {
        optimisticUpdate: () => ({ isRunning: false, timeRemaining: null }),
      });
      if (preferences.hidenWhenDecaffeinated) {
        showHUD("Your Mac is now decaffeinated");
      }
    } else {
      setLocalCaffeinateStatus(true);
      await mutate(startCaffeinate({ menubar: true, status: true }), {
        optimisticUpdate: () => ({ isRunning: true, timeRemaining: null }),
      });
    }
  };

  if (preferences.hidenWhenDecaffeinated && !displayCaffeinateStatus && !isLoading) {
    return null;
  }

  return (
    <MenuBarExtra
      isLoading={caffeinateLoader}
      icon={
        displayCaffeinateStatus
          ? { source: `${preferences.icon}-filled.svg`, tintColor: Color.PrimaryText }
          : { source: `${preferences.icon}-empty.svg`, tintColor: Color.PrimaryText }
      }
    >
      {isLoading ? null : (
        <>
          <MenuBarExtra.Section title={`Your mac is ${displayCaffeinateStatus ? "caffeinated" : "decaffeinated"}`} />
          {displayCaffeinateStatus && extraInfoStr && <MenuBarExtra.Section title={extraInfoStr} />}
          <MenuBarExtra.Item
            title={displayCaffeinateStatus ? "Decaffeinate" : "Caffeinate"}
            onAction={handleCaffeinateStatus}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
