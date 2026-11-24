import { launchCommand, LaunchType, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { stageStatus } from "swift:../swift";
import { stateDirectory } from "./lib/stage";

export default function Command() {
  const { data, isLoading } = usePromise(() => stageStatus(stateDirectory));
  const active = data?.active ?? false;

  const toggle = () => launchCommand({ name: "toggle-focus-stage", type: LaunchType.UserInitiated });

  return (
    <MenuBarExtra
      icon={active ? "menubar-face-relieved.png" : "menubar-face-awake.png"}
      tooltip={active ? "Focus Stage is on" : "Focus Stage"}
      isLoading={isLoading}
    >
      {active ? (
        <>
          <MenuBarExtra.Item title={`Focusing on ${data?.app ?? "a window"}`} />
          <MenuBarExtra.Item title="End Focus" onAction={toggle} />
        </>
      ) : (
        <MenuBarExtra.Item title="Start Focus" onAction={toggle} />
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Settings…" onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
