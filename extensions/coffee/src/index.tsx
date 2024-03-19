import { Color, LaunchProps, MenuBarExtra, getPreferenceValues } from "@raycast/api";
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
  const preferences = getPreferenceValues<Preferences.Index>();

  if (preferences.hidenWhenDecaffeinated && !caffeinateStatus && !isLoading) {
    return null;
  }

  return (
    <MenuBarExtra
      isLoading={caffeinateLoader}
      icon={
        caffeinateStatus
          ? { source: `${preferences.icon}-filled.svg`, tintColor: Color.PrimaryText }
          : { source: `${preferences.icon}-empty.svg`, tintColor: Color.PrimaryText }
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
