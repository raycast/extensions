import { Action, ActionPanel, Icon } from "@raycast/api";
import type { SetupState, SetupStep } from "../lib/search-setup";

export type SetupActionsProps = {
  setup: SetupState;
  importing: boolean;
  start: () => void;
  cancel: () => void;
  skip: (step: SetupStep) => void;
};

/** Setup remains reachable after the one-time prompt is dismissed. */
export function SetupActions({
  setup,
  importing,
  start,
  cancel,
  skip,
}: SetupActionsProps) {
  return (
    <ActionPanel.Section title="Search Setup">
      {importing ? (
        <Action title="Stop Setup" onAction={cancel} />
      ) : (
        <>
          <Action
            // "Set up" is a phrasal verb.
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Set Up Search"
            icon={Icon.Clock}
            onAction={start}
          />
          {setup.recents && (
            <Action
              title="Skip Recent Files"
              onAction={() => skip("recents")}
            />
          )}
          {setup.drive && (
            <Action title="Skip Google Drive" onAction={() => skip("drive")} />
          )}
        </>
      )}
    </ActionPanel.Section>
  );
}
