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

function useExtraInfoStr(): string | null {
  const { data } = useExec("ps -o etime,args= -p $(pgrep caffeinate)", [], {
    shell: true,
    parseOutput: (output) => output.stdout,
  });

  if (!data) {
    // caffeinate not running
    return null;
  }

  const lines = data.trim().split("\n");
  const [etime, ...cmdArgs] = lines[lines.length - 1].trim().split(/\s+/);

  const secondsRunning = parseEtime(etime);

  const timeoutMatch = cmdArgs.join(" ").match(/-t (\d+)/);
  if (timeoutMatch) {
    const secondsRemain = parseInt(timeoutMatch[1]) - secondsRunning;

    return `${formatDuration(secondsRemain)} remain`;
  }

  return null;
}

export default function Command(props: LaunchProps) {
  const hasLaunchContext = props.launchContext?.caffeinated !== undefined;

  const { isLoading, data, mutate } = useExec("pgrep caffeinate", [], {
    shell: true,
    execute: !hasLaunchContext,
    parseOutput: (output) => output.stdout.length > 0,
  });

  const caffeinateStatus = hasLaunchContext ? props?.launchContext?.caffeinated : data;
  const caffeinateLoader = hasLaunchContext ? false : isLoading;
  const preferences = getPreferenceValues<Preferences.Index>();

  const extraInfoStr = useExtraInfoStr();

  const [localCaffeinateStatus, setLocalCaffeinateStatus] = useState(caffeinateStatus);

  useEffect(() => {
    setLocalCaffeinateStatus(caffeinateStatus);
  }, [caffeinateStatus]);

  const handleCaffeinateStatus = async () => {
    if (localCaffeinateStatus) {
      setLocalCaffeinateStatus(false);
      await mutate(stopCaffeinate({ menubar: true, status: true }), {
        optimisticUpdate: () => false,
      });
      if (preferences.hidenWhenDecaffeinated) {
        showHUD("Your Mac is now decaffeinated");
      }
    } else {
      setLocalCaffeinateStatus(true);
      await mutate(startCaffeinate({ menubar: true, status: true }), {
        optimisticUpdate: () => true,
      });
    }
  };

  if (preferences.hidenWhenDecaffeinated && !localCaffeinateStatus && !isLoading) {
    return null;
  }

  return (
    <MenuBarExtra
      isLoading={caffeinateLoader}
      icon={
        localCaffeinateStatus
          ? { source: `${preferences.icon}-filled.svg`, tintColor: Color.PrimaryText }
          : { source: `${preferences.icon}-empty.svg`, tintColor: Color.PrimaryText }
      }
    >
      {isLoading ? null : (
        <>
          <MenuBarExtra.Section title={`Your mac is ${localCaffeinateStatus ? "caffeinated" : "decaffeinated"}`} />
          {localCaffeinateStatus && extraInfoStr && <MenuBarExtra.Section title={extraInfoStr} />}
          <MenuBarExtra.Item
            title={localCaffeinateStatus ? "Decaffeinate" : "Caffeinate"}
            onAction={handleCaffeinateStatus}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
