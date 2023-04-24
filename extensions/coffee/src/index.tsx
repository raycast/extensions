import { environment, MenuBarExtra, updateCommandMetadata } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect } from "react";
import { stopCaffeinate, startCaffeinate } from "./utils";

export default function Command() {
  const hasLaunchContext = environment.launchContext?.caffinated !== undefined;

  const { isLoading, data, mutate } = useExec("ps aux | pgrep caffeinate", [], {
    shell: true,
    execute: hasLaunchContext ? false : true,
    parseOutput: (output) => output.stdout.length > 0,
  });

  const caffinateStatus = hasLaunchContext ? environment.launchContext?.caffinated : data;
  const caffinateLoader = hasLaunchContext ? false : isLoading;

  useEffect(() => {
    const updateSubtitle = async () => {
      updateCommandMetadata({ subtitle: `Status: ${caffinateStatus ? "Caffinated" : "Decaffinated"}` });
    };

    updateSubtitle();
  }, [caffinateStatus]);

  return (
    <MenuBarExtra
      isLoading={caffinateLoader}
      icon={
        caffinateStatus
          ? { source: { light: "coffee.png", dark: "coffeedark.png" } }
          : { source: { light: "coffee-off.png", dark: "coffeedark-off.png" } }
      }
    >
      {isLoading ? null : (
        <>
          <MenuBarExtra.Section title={`Your mac is ${caffinateStatus ? "caffeinated" : "decaffeinated"}`} />
          <MenuBarExtra.Item
            title={caffinateStatus ? "Decaffeinate" : "Caffeinate"}
            onAction={async () => {
              if (!caffinateStatus) {
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
