import { LaunchProps, MenuBarExtra } from "@raycast/api";
import { useExec } from "@raycast/utils";
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
              if (caffeinateStatus) {
                // Kill caffeinate process
                await mutate(stopCaffeinate({ menubar: false, status: true }), { optimisticUpdate: () => false });
              } else {
                // Spawn a new process to run caffeinate
                await mutate(startCaffeinate({ menubar: false, status: true }), { optimisticUpdate: () => true });
              }
            }}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
