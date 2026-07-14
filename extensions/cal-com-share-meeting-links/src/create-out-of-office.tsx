import { LaunchProps } from "@raycast/api";
import { useOOOEntries } from "@api/cal.com";
import { EditOOO, Values } from "@components/edit-ooo";

/**
 * Top-level "Create Out of Office" command. Renders the EditOOO form directly
 * (not pushed via Action.Push) so Raycast's native draft persistence works:
 * navigating away saves a draft, returning prompts to resume or discard.
 *
 * The pushed in-context create flow (from inside the "Out of Office" command's
 * list) intentionally does NOT use drafts — Raycast doesn't support drafts for
 * forms nested in navigation.
 */
export default function CreateOutOfOffice(props: LaunchProps<{ draftValues: Values }>) {
  const { mutate } = useOOOEntries();
  return <EditOOO mutate={mutate} enableDrafts draftValues={props.draftValues} />;
}
