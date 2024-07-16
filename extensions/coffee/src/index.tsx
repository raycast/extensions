import { Color, LaunchProps, MenuBarExtra, getPreferenceValues, showHUD } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect, useState } from "react";
import { startCaffeinate, stopCaffeinate } from "./utils";

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
          <MenuBarExtra.Item
            title={localCaffeinateStatus ? "Decaffeinate" : "Caffeinate"}
            onAction={handleCaffeinateStatus}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
