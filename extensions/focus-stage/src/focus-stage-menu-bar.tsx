import { MenuBarExtra, openExtensionPreferences, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { stageStatus } from "swift:../swift";
import { runToggle, stateDirectory } from "./lib/stage";

export default function Command() {
  // Cached: every run (each click, each refresh) starts from the last known state instead of
  // showing the idle icon until the status arrives.
  const { data, isLoading, mutate } = useCachedPromise((directory: string) => stageStatus(directory), [stateDirectory]);
  const [toggling, setToggling] = useState(false);
  const active = data?.active ?? false;

  // Toggled here rather than through the Toggle command: a command launched from this one can't
  // refresh it while it is still running, so the icon would stay as it was.
  const toggle = async () => {
    setToggling(true);
    try {
      const outcome = await runToggle({ closeRaycast: false });
      await mutate(Promise.resolve({ active: outcome.active, app: outcome.app }), {
        optimisticUpdate: () => ({ active: outcome.active, app: outcome.app }),
        shouldRevalidateAfter: true,
      });
      // Menu bar commands can't show toasts; a HUD works here.
      if (outcome.error) await showHUD(`Focus Stage didn't start: ${outcome.error}`);
    } catch (error) {
      await showHUD(`Focus Stage failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setToggling(false);
    }
  };

  return (
    <MenuBarExtra
      icon={active ? "menubar-face-relieved.png" : "menubar-face-awake.png"}
      tooltip={active ? "Focus Stage is on" : "Focus Stage"}
      isLoading={isLoading || toggling}
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
