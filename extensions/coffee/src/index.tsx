import { LaunchProps, MenuBarExtra, updateCommandMetadata } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect } from "react";
import { stopCaffeinate, startCaffeinate } from "./utils";

export default function Command(props: LaunchProps) {
  const hasLaunchContext = props.launchContext?.caffeinated !== undefined;

  const { isLoading, data, mutate } = useExec("pgrep caffeinate", [], {
    shell: true,
    execute: hasLaunchContext ? false : true,
    parseOutput: (output) => output.stdout.length > 0,
  });

  const caffeinateStatus = hasLaunchContext ? props.launchContext?.caffeinated : data;
  const caffeinateLoader = hasLaunchContext ? false : isLoading;

  useEffect(() => {
    const updateSubtitle = async () => {
      updateCommandMetadata({ subtitle: `Status: ${caffeinateStatus ? "Caffeinated" : "Decaffeinated"}` });
    };

    updateSubtitle();
  }, [caffeinateStatus]);

  return (
    <MenuBarExtra
      isLoading={caffeinateLoader}
      icon={
        caffeinateStatus
          ? { source: { light: "coffee.png", dark: "coffeedark.png" } }
          : { source: { light: "coffee-off.png", dark: "coffeedark-off.png" } }
      }
    >
      {isLoading ? null : (
        <>
          <MenuBarExtra.Section title={`Your mac is ${caffeinateStatus ? "caffeinated" : "decaffeinated"}`} />
          <MenuBarExtra.Item
            title={caffeinateStatus ? "Decaffeinate" : "Caffeinate"}
            onAction={async () => {
              if (!caffeinateStatus) {
                // Spawn a new process to run caffeinate
                await mutate(startCaffeinate(false), { optimisticUpdate: () => true });
                return;
              }

              // Kill caffeinate process
              await mutate(stopCaffeinate(false), { optimisticUpdate: () => false });
            }}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
