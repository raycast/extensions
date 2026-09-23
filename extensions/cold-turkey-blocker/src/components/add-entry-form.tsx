import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { buildAddEntryArgs, type EntryKind } from "../lib/command-builders";
import { parseEntryLines } from "../lib/entries";
import { runColdTurkey } from "../lib/cold-turkey";
import { formatCliError } from "../lib/ui";

interface AddEntryFormProps {
  blockName: string;
  initialKind?: EntryKind;
  onSuccess?: () => void | Promise<void>;
}

export function AddEntryForm({ blockName, initialKind = "website", onSuccess }: AddEntryFormProps) {
  const { pop } = useNavigation();
  const [kind, setKind] = useState<EntryKind>(initialKind);
  const [entriesText, setEntriesText] = useState("");
  const [entriesError, setEntriesError] = useState<string>();

  async function handleSubmit() {
    const entries = parseEntryLines(entriesText);

    setEntriesError(undefined);
    if (entries.length === 0) {
      setEntriesError("Enter at least one website or pattern.");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Adding ${entries.length} ${entryNoun(kind, entries.length)}…`,
      message: blockName,
    });

    let successCount = 0;
    const failures: { entry: string; error: unknown }[] = [];

    for (const [index, entry] of entries.entries()) {
      toast.title = `Adding ${index + 1} of ${entries.length}…`;
      try {
        await runColdTurkey(buildAddEntryArgs(blockName, kind, entry));
        successCount += 1;
      } catch (error) {
        failures.push({ entry, error });
      }
    }

    if (successCount > 0) await onSuccess?.();

    if (failures.length > 0) {
      toast.style = Toast.Style.Failure;
      toast.title = `${successCount} added, ${failures.length} failed`;
      toast.message = `${failures[0].entry}: ${formatCliError(failures[0].error, 220)}`;
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = `Added ${successCount} ${entryNoun(kind, successCount)}`;
    toast.message = "Cold Turkey returned no error; this CLI has no entry read-back command.";
    pop();
  }

  return (
    <Form
      navigationTitle="Add Websites or Exceptions"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={kind === "website" ? "Add to Website List" : "Add to Exception List"}
            icon={kind === "website" ? Icon.Globe : Icon.Shield}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Block" text={blockName} />

      <Form.Dropdown id="kind" title="Destination" value={kind} onChange={(value) => setKind(value as EntryKind)}>
        <Form.Dropdown.Item value="website" title="Website List" icon={Icon.Globe} />
        <Form.Dropdown.Item value="exception" title="Exception List" icon={Icon.Shield} />
      </Form.Dropdown>

      <Form.TextArea
        id="entries"
        title="Websites or Patterns"
        placeholder={"youtube.com\nreddit.com/r/all\n*example*"}
        value={entriesText}
        onChange={(value) => {
          setEntriesText(value);
          setEntriesError(undefined);
        }}
        error={entriesError}
        info="One entry per line. Cold Turkey wildcard patterns are accepted; a URL scheme is not required."
      />

      {kind === "exception" ? (
        <Form.Description
          title="Unlocked Blocks Only"
          text="Cold Turkey only allows the CLI to add exceptions while the selected block is unlocked."
        />
      ) : null}
    </Form>
  );
}

function entryNoun(kind: EntryKind, count: number): string {
  const singular = kind === "website" ? "website" : "exception";
  return count === 1 ? singular : `${singular}s`;
}
