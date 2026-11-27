import { Action, ActionPanel, Form, Icon, showInFinder, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { useRef, useState } from "react";
import { createCatalogStore } from "../catalog/cache";
import { applyImport, exportAll, getPrompts, getSnippets, raycastIconKey } from "../prompts/store";
import {
  parseImport,
  planImport,
  serializeExport,
  type ConflictAction,
  type ImportIssue,
  type ImportPlan,
} from "../prompts/transfer";
import { showError } from "./feedback";

/** Prompt files are small. The limit stops an accidental pick of a huge file from blocking Raycast. */
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** The form stays readable with a damaged file, so only the first problems are listed. */
const MAX_LISTED_ISSUES = 5;

/** Bounds the search for a free file name. Nobody exports a thousand times a day into one folder. */
const MAX_NAME_ATTEMPTS = 1000;

/**
 * Never replaces a file, because an earlier export may be the only backup. A second export of the day gets a number,
 * and the exclusive flag also covers a file that appears between the check and the write.
 */
async function writeNewFile(folder: string, base: string, content: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_NAME_ATTEMPTS; attempt += 1) {
    const target = path.join(folder, attempt === 1 ? `${base}.json` : `${base}-${attempt}.json`);
    try {
      // Owner-only: prompts can hold work content, even though the export never contains API keys.
      await writeFile(target, content, { mode: 0o600, flag: "wx" });
      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new Error("Too many exports with the same name in this folder.");
}

export function ExportForm() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ folder: string[] }>({
    initialValues: { folder: [path.join(homedir(), "Downloads")] },
    validation: { folder: (value) => (value?.[0] ? undefined : "Choose a folder") },
    onSubmit: async ({ folder }) => {
      const date = new Date().toISOString().slice(0, 10);
      try {
        const content = serializeExport(await exportAll());
        const target = await writeNewFile(folder[0] ?? homedir(), `ai-commander-export-${date}`, content);
        await showToast({ style: Toast.Style.Success, title: "Export Saved", message: path.basename(target) });
        await showInFinder(target);
        pop();
      } catch (error) {
        await showError("Export Failed", error);
      }
    },
  });

  return (
    <Form
      navigationTitle="Export Prompts"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Exports prompts, snippets, and settings. API keys are never included." />
      <Form.FilePicker
        {...itemProps.folder}
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}

function issueText(issue: ImportIssue): string {
  return `${issue.path}: ${issue.message}`;
}

interface ImportFormProps {
  onImported: () => void | Promise<void>;
}

export function ImportForm({ onImported }: ImportFormProps) {
  const { pop } = useNavigation();
  const [plan, setPlan] = useState<ImportPlan>();
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  // The user can pick another file while the first one is still loading. Only the latest pick may set the plan.
  const latestPick = useRef(0);

  async function prepare(file: string) {
    const pick = ++latestPick.current;
    const { size } = await stat(file);
    if (size > MAX_IMPORT_BYTES) throw new Error("The file is too large for a prompt export.");
    const knownModels = createCatalogStore()
      .read()
      .entries.map((entry) => entry.ref);
    const parsed = parseImport(await readFile(file, "utf8"), { knownModels, resolveIcon: raycastIconKey });
    const next = planImport(parsed, { prompts: await getPrompts(), snippets: await getSnippets() });
    if (pick === latestPick.current) {
      setPlan(next);
      setIssues(parsed.issues);
    }
    return next;
  }

  const { handleSubmit, itemProps } = useForm<{ file: string[]; conflicts: string; includeSettings: boolean }>({
    initialValues: { conflicts: "copy", includeSettings: false },
    validation: { file: (value) => (value?.[0] ? undefined : "Choose a file") },
    onSubmit: async ({ file, conflicts, includeSettings }) => {
      try {
        const current = plan ?? (await prepare(file[0] ?? ""));
        const summary = await applyImport(current, { resolve: conflicts as ConflictAction, includeSettings });
        await showToast({
          style: Toast.Style.Success,
          title: "Import Finished",
          message: `${summary.added} added, ${summary.overwritten} overwritten, ${summary.copied} copied, ${summary.skipped} skipped`,
        });
        await onImported();
        pop();
      } catch (error) {
        await showError("Import Failed", error);
      }
    },
  });

  async function onFileChange(files: string[]) {
    itemProps.file.onChange?.(files);
    const file = files[0];
    setPlan(undefined);
    if (!file) return;
    try {
      await prepare(file);
    } catch (error) {
      await showError("Cannot Read File", error);
    }
  }

  return (
    <Form
      navigationTitle="Import Prompts"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Accepts AI-Commander exports and Raycast AI Commands files." />
      <Form.FilePicker {...itemProps.file} onChange={onFileChange} title="File" allowMultipleSelection={false} />
      {plan && (
        <Form.Description
          title="Found"
          text={`${plan.entries.length} entries, ${plan.conflicts.length} conflicts, ${issues.length} skipped or changed`}
        />
      )}
      {plan &&
        issues
          .slice(0, MAX_LISTED_ISSUES)
          .map((issue) => (
            <Form.Description key={`${issue.path}:${issue.message}`} title={issue.severity} text={issueText(issue)} />
          ))}
      {plan && issues.length > MAX_LISTED_ISSUES && (
        <Form.Description text={`And ${issues.length - MAX_LISTED_ISSUES} more.`} />
      )}
      <Form.Dropdown {...itemProps.conflicts} title="On Conflict">
        <Form.Dropdown.Item value="copy" title="Keep Both" />
        <Form.Dropdown.Item value="overwrite" title="Overwrite Existing" />
        <Form.Dropdown.Item value="skip" title="Skip" />
      </Form.Dropdown>
      {plan?.settings && <Form.Checkbox {...itemProps.includeSettings} label="Also Import Settings" />}
    </Form>
  );
}
