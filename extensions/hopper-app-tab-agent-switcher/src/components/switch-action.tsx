import { Action, closeMainWindow, Icon, PopToRootType } from "@raycast/api";
import { showFailure } from "../lib/platform/report";

/** List action that switches somewhere, then closes Raycast. Shared by History and the tab lists. */
export function SwitchAction({
  title,
  failureTitle,
  onSwitch,
}: {
  title: string;
  failureTitle: string;
  onSwitch: () => Promise<void>;
}) {
  return (
    <Action
      title={title}
      icon={Icon.ArrowRight}
      onAction={async () => {
        // Switch first: closing the window with Immediate unmounts this view and kills the command before
        // the switch runs (ADR-009, https://github.com/mattherwig/hopper/blob/main/docs/DECISIONS.md).
        try {
          await onSwitch();
        } catch (error) {
          // Reported under the action's title: the failure title names the tab.
          await showFailure(error, failureTitle, title);
          return;
        }
        await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      }}
    />
  );
}
