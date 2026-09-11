import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { buildAddEntryArgs, buildCreateBlockArgs, type BlockCreationKind } from "../lib/command-builders";
import { listBlocks, runColdTurkey, waitForBlockPresence } from "../lib/cold-turkey";
import type { BlockKind } from "../lib/cli-output";
import { initialBlockEntries, summarizeEntryCounts, type BlockEntryInput } from "../lib/entries";
import { applyCliFailureToast, formatCliError } from "../lib/ui";

interface CreateBlockFormProps {
  onSuccess?: () => void | Promise<void>;
}

interface EntryFailure extends BlockEntryInput {
  error: unknown;
}

export function CreateBlockForm({ onSuccess }: CreateBlockFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<BlockCreationKind>("website-app");
  const [websitesText, setWebsitesText] = useState("");
  const [exceptionsText, setExceptionsText] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [websitesError, setWebsitesError] = useState<string>();
  const [exceptionsError, setExceptionsError] = useState<string>();

  const entries = kind === "website-app" ? initialBlockEntries(websitesText, exceptionsText) : [];

  async function handleSubmit() {
    const trimmedName = name.trim();
    const initialEntries = kind === "website-app" ? initialBlockEntries(websitesText, exceptionsText) : [];

    setNameError(undefined);
    setWebsitesError(undefined);
    setExceptionsError(undefined);

    if (!trimmedName) {
      setNameError("Enter a block name.");
      return;
    }
    if (/[\r\n\0]/.test(trimmedName)) {
      setNameError("Block names cannot contain line breaks or null characters.");
      return;
    }

    for (const entry of initialEntries) {
      try {
        buildAddEntryArgs(trimmedName, entry.kind, entry.entry);
      } catch (error) {
        const message = formatCliError(error, 180);
        if (entry.kind === "website") setWebsitesError(message);
        else setExceptionsError(message);
        return;
      }
    }

    try {
      const existing = (await listBlocks()).find(
        (block) => block.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
      );
      if (existing) {
        setNameError(`A block named “${existing.name}” already exists.`);
        return;
      }
    } catch (error) {
      setNameError(`Could not check existing names: ${formatCliError(error, 180)}`);
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${trimmedName}…`,
    });

    try {
      await runColdTurkey(buildCreateBlockArgs(trimmedName, kind));
      await waitForBlockPresence(trimmedName, creationBlockKind(kind));

      const failures: EntryFailure[] = [];
      let successCount = 0;

      for (const [index, entry] of initialEntries.entries()) {
        toast.title = `Adding ${index + 1} of ${initialEntries.length}…`;
        toast.message = `${entryLabel(entry.kind)}: ${entry.entry}`;

        try {
          await runColdTurkey(buildAddEntryArgs(trimmedName, entry.kind, entry.entry));
          successCount += 1;
        } catch (error) {
          failures.push({ ...entry, error });
        }
      }

      if (failures.length > 0) {
        const firstFailure = failures[0];
        const additionalFailures = failures.length - 1;

        toast.style = Toast.Style.Failure;
        toast.title = `Created ${trimmedName}; ${successCount}/${initialEntries.length} entries added`;
        toast.message = [
          `${entryLabel(firstFailure.kind)} “${firstFailure.entry}”: ${formatCliError(firstFailure.error, 180)}`,
          additionalFailures > 0
            ? `${additionalFailures} more ${additionalFailures === 1 ? "entry" : "entries"} failed.`
            : undefined,
          "The failed inputs remain shown here; use Add Websites or Exceptions to retry.",
        ]
          .filter(Boolean)
          .join(" ");
        setWebsitesError(formatEntryFailures(failures.filter((failure) => failure.kind === "website")));
        setExceptionsError(formatEntryFailures(failures.filter((failure) => failure.kind === "exception")));
        await refreshParent(onSuccess);
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title =
        initialEntries.length > 0 ? `Created ${trimmedName} with initial entries` : `Created ${trimmedName}`;
      toast.message =
        initialEntries.length > 0
          ? `${summarizeEntryCounts(initialEntries)} added. Cold Turkey has no CLI command to read entries back.`
          : `Confirmed in ${creationKindLabel(kind)} blocks`;
      await refreshParent(onSuccess);
      pop();
    } catch (error) {
      applyCliFailureToast(toast, error, "Could not verify block creation");
    }
  }

  return (
    <Form
      navigationTitle="Create Block"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              kind !== "website-app"
                ? "Create Device Block"
                : entries.length > 0
                  ? "Create Block with Initial Contents"
                  : "Create Empty Block"
            }
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Block Name"
        placeholder="Deep Work"
        value={name}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
        error={nameError}
        info="Names are checked case-insensitively before creation, then confirmed through -list-blocks."
      />

      <Form.Dropdown
        id="kind"
        title="Block Type"
        value={kind}
        onChange={(value) => setKind(value as BlockCreationKind)}
      >
        <Form.Dropdown.Item value="website-app" title="Website & App Block" icon={Icon.Globe} />
        <Form.Dropdown.Item value="device-lock" title="Device Block — Lock Screen" icon={Icon.Lock} />
        <Form.Dropdown.Item value="device-sign-out" title="Device Block — Sign Out" icon={Icon.Person} />
        <Form.Dropdown.Item value="device-shut-down" title="Device Block — Shut Down" icon={Icon.Power} />
      </Form.Dropdown>

      {kind === "website-app" ? (
        <>
          <Form.Separator />
          <Form.Description
            title="Initial Contents"
            text="Optional. Add one website, URL, or Cold Turkey pattern per line now, or leave both lists empty. Applications can be added later in Cold Turkey; its CLI exposes only website and exception entry commands."
          />
          <Form.TextArea
            id="websites"
            title="Website List (Optional)"
            placeholder={"youtube.com\nreddit.com/r/all\n*social*"}
            value={websitesText}
            onChange={(value) => {
              setWebsitesText(value);
              setWebsitesError(undefined);
            }}
            error={websitesError}
            info="Entries are added after the block is created. A URL scheme is not required."
          />
          <Form.TextArea
            id="exceptions"
            title="Exception List (Optional)"
            placeholder={"docs.example.com\nexample.com/safe"}
            value={exceptionsText}
            onChange={(value) => {
              setExceptionsText(value);
              setExceptionsError(undefined);
            }}
            error={exceptionsError}
            info="Exceptions are added immediately after creation, before the new block can be started or locked."
          />
        </>
      ) : (
        <Form.Description
          title="Device Block"
          text="This creates the device block only. It does not activate it. A basic start enables its schedule; a timed start may activate the configured device action immediately."
        />
      )}
    </Form>
  );
}

async function refreshParent(onSuccess: CreateBlockFormProps["onSuccess"]): Promise<void> {
  try {
    await onSuccess?.();
  } catch (error) {
    console.error("Could not refresh blocks after creation", error);
  }
}

function creationBlockKind(kind: BlockCreationKind): BlockKind {
  return kind === "website-app" ? "website-app" : "device";
}

function creationKindLabel(kind: BlockCreationKind): string {
  return kind === "website-app" ? "Website & App" : "Device";
}

function entryLabel(kind: BlockEntryInput["kind"]): string {
  return kind === "website" ? "Website" : "Exception";
}

function formatEntryFailures(failures: EntryFailure[]): string | undefined {
  if (failures.length === 0) return undefined;
  return failures.map((failure) => `${failure.entry}: ${formatCliError(failure.error, 120)}`).join("\n");
}
