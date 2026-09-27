import { useEffect, useMemo, useState } from "react";
import path from "path";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  popToRoot,
  showInFinder,
  showToast,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { ConflictStrategy, SourceItem, describe, getSelection, planTemplateCopies, runCopies } from "./lib/duplicate";
import { TEMPLATE_VARIABLES, templateUsesCounter } from "./lib/template";

type Preferences = {
  defaultTemplate: string;
  revealInFinder: boolean;
};

const MAX_COPIES = 500;
const PREVIEW_LIMIT = 5;

/** Parses a whole-number form field, returning `undefined` when the text is unusable. */
function parseInteger(value: string, { min }: { min: number }): number | undefined {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed >= min ? parsed : undefined;
}

function VariableReference() {
  const rows = TEMPLATE_VARIABLES.map(
    (variable) => `| \`${variable.token}\` | ${variable.description} | ${variable.example} |`,
  ).join("\n");

  const markdown = [
    "# Naming Variables",
    "",
    "| Variable | Description | Example |",
    "| --- | --- | --- |",
    rows,
    "",
    "## Notes",
    "",
    "- The original extension is added automatically unless the template already contains `{ext}` or `{base}`.",
    "- Write `{{` and `}}` for a literal brace.",
    "- Modifiers chain onto text variables: `{parent:kebab}`, `{name:pascal}`.",
    "- Date and time variables take a format instead: `{date:dddd, MMMM D}`, `{time:hh-mm A}`.",
    "",
    "## Examples",
    "",
    "| Template | Result |",
    "| --- | --- |",
    "| `{name} copy {n}` | `Invoice copy 1.pdf` |",
    "| `{name}-{n:3}` | `Invoice-001.pdf` |",
    "| `{date} {name}` | `2026-09-06 Invoice.pdf` |",
    "| `{name:snake}_v{n}` | `invoice_v1.pdf` |",
    "| `{parent} - {name} ({n} of {total})` | `Documents - Invoice (1 of 5).pdf` |",
    "| `{name}.{ext}.bak{n}` | `Invoice.pdf.bak1` |",
  ].join("\n");

  return <Detail markdown={markdown} navigationTitle="Naming Variables" />;
}

export default function DuplicateWithNaming() {
  const preferences = getPreferenceValues<Preferences>();

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<string[]>([]);
  const [destination, setDestination] = useState<string[]>([]);

  // Cached so the form reopens with the last setup instead of starting from scratch each time.
  const [template, setTemplate] = useCachedState("template", preferences.defaultTemplate || "{name} copy {n}");
  const [copies, setCopies] = useCachedState("copies", "1");
  const [start, setStart] = useCachedState("start", "1");
  const [padding, setPadding] = useCachedState("padding", "1");
  const [conflict, setConflict] = useCachedState<ConflictStrategy>("conflict", "unique");

  useEffect(() => {
    (async () => {
      const selection = await getSelection();
      setFiles(selection.map((item) => item.path));
      setLoading(false);
    })();
  }, []);

  // The picker hands back bare paths; keep the described sources in step with whatever is chosen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const described = await Promise.all(
        files.map(async (file) => {
          try {
            return await describe(file);
          } catch {
            return undefined;
          }
        }),
      );
      if (!cancelled) {
        setSources(described.filter((item): item is SourceItem => item !== undefined));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const copyCount = parseInteger(copies, { min: 1 });
  const startIndex = parseInteger(start, { min: 0 });
  const padWidth = parseInteger(padding, { min: 1 });

  const preview = useMemo(() => {
    const nothing = { lines: [] as string[], unknown: [] as string[], note: undefined as string | undefined };

    if (sources.length === 0) {
      return { ...nothing, note: "Select at least one file or folder." };
    }
    if (!template.trim()) {
      return { ...nothing, note: "Enter a name template." };
    }
    if (copyCount === undefined || startIndex === undefined || padWidth === undefined) {
      return { ...nothing, note: "Copies, start and padding must be whole numbers." };
    }

    const { plan, unknownTokens, invalid } = planTemplateCopies(sources, {
      template,
      copies: copyCount,
      start: startIndex,
      padding: padWidth,
      destination: destination[0],
    });

    if (plan.length === 0) {
      return { ...nothing, unknown: unknownTokens, note: invalid[0]?.message ?? "Nothing to duplicate." };
    }

    const lines = plan.slice(0, PREVIEW_LIMIT).map((item) => path.basename(item.target));
    if (plan.length > PREVIEW_LIMIT) {
      lines.push(`… and ${plan.length - PREVIEW_LIMIT} more`);
    }
    return { lines, unknown: unknownTokens, note: undefined };
  }, [sources, template, copyCount, startIndex, padWidth, destination]);

  const previewText = [
    preview.note,
    preview.lines.join("\n"),
    preview.unknown.length > 0 ? `Unknown variable: ${preview.unknown.join(" ")}` : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  const repeatsWithoutCounter = (copyCount ?? 1) > 1 && !templateUsesCounter(template);

  async function handleSubmit() {
    if (sources.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select at least one file or folder" });
      return;
    }
    if (!template.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a name template" });
      return;
    }
    if (copyCount === undefined || startIndex === undefined || padWidth === undefined) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check the numbers",
        message: "Copies, start and padding must be whole numbers",
      });
      return;
    }
    if (copyCount > MAX_COPIES) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Too many copies",
        message: `Refusing to make more than ${MAX_COPIES} copies at once`,
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Duplicating…" });

    const { plan, invalid } = planTemplateCopies(sources, {
      template,
      copies: copyCount,
      start: startIndex,
      padding: padWidth,
      destination: destination[0],
    });

    if (plan.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Nothing to duplicate";
      toast.message = invalid[0]?.message;
      return;
    }

    const outcome = await runCopies(plan, conflict);

    if (outcome.created.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Nothing was duplicated";
      toast.message = outcome.failed[0]?.message ?? outcome.skipped[0]?.reason ?? "Every copy was skipped";
      return;
    }

    const notes = [
      outcome.skipped.length > 0 ? `${outcome.skipped.length} skipped` : undefined,
      outcome.failed.length > 0 ? `${outcome.failed.length} failed: ${outcome.failed[0].message}` : undefined,
    ].filter(Boolean);

    toast.style = outcome.failed.length > 0 ? Toast.Style.Failure : Toast.Style.Success;
    toast.title =
      outcome.created.length === 1
        ? `Created ${path.basename(outcome.created[0])}`
        : `Created ${outcome.created.length} copies`;
    toast.message = notes.length > 0 ? notes.join(", ") : undefined;

    if (preferences.revealInFinder) {
      await showInFinder(outcome.created[0]);
      await closeMainWindow();
    } else {
      await popToRoot();
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Duplicate" icon={Icon.Duplicate} onSubmit={handleSubmit} />
          <Action.Push
            title="Variable Reference"
            icon={Icon.QuestionMarkCircle}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "/" }, Windows: { modifiers: ["ctrl"], key: "/" } }}
            target={<VariableReference />}
          />
          <ActionPanel.Section title="Presets">
            <Action title="Numbered Copy" icon={Icon.Text} onAction={() => setTemplate("{name} copy {n}")} />
            <Action title="Padded Number" icon={Icon.Text} onAction={() => setTemplate("{name}-{n:3}")} />
            <Action title="Date Prefix" icon={Icon.Calendar} onAction={() => setTemplate("{date} {name}")} />
            <Action
              title="Name Version and Time"
              icon={Icon.Clock}
              onAction={() => setTemplate("{name} v{n} {time}")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Files"
        value={files}
        onChange={setFiles}
        canChooseDirectories
        canChooseFiles
        allowMultipleSelection
        info="Pre-filled from the current Finder selection."
      />

      <Form.TextField
        id="template"
        title="Name Template"
        placeholder="{name} copy {n}"
        value={template}
        onChange={setTemplate}
        error={template.trim() ? undefined : "Required"}
        info={TEMPLATE_VARIABLES.map((variable) => `${variable.token} — ${variable.description}`).join("\n")}
      />

      <Form.Description title="Preview" text={previewText} />

      <Form.Separator />

      <Form.TextField
        id="copies"
        title="Copies"
        placeholder="1"
        value={copies}
        onChange={setCopies}
        error={copyCount === undefined ? "Whole number, 1 or more" : undefined}
        info={
          repeatsWithoutCounter
            ? "Add {n} to the template so repeated copies get distinct names."
            : "How many copies to make of each selected item."
        }
      />

      <Form.TextField
        id="start"
        title="Start At"
        placeholder="1"
        value={start}
        onChange={setStart}
        error={startIndex === undefined ? "Whole number, 0 or more" : undefined}
        info="The value {n} takes for the first copy of each file."
      />

      <Form.TextField
        id="padding"
        title="Padding"
        placeholder="1"
        value={padding}
        onChange={setPadding}
        error={padWidth === undefined ? "Whole number, 1 or more" : undefined}
        info="Minimum digits for {n}. Set 3 to turn 7 into 007. {n:2} overrides this per token."
      />

      <Form.Dropdown
        id="conflict"
        title="If the Name Exists"
        value={conflict}
        onChange={(value) => setConflict(value as ConflictStrategy)}
      >
        <Form.Dropdown.Item value="unique" title="Add a Number" icon={Icon.PlusCircle} />
        <Form.Dropdown.Item value="skip" title="Skip the Copy" icon={Icon.MinusCircle} />
        <Form.Dropdown.Item value="overwrite" title="Replace It" icon={Icon.ExclamationMark} />
      </Form.Dropdown>

      <Form.FilePicker
        id="destination"
        title="Destination"
        value={destination}
        onChange={setDestination}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        info="Leave empty to put each copy next to its original."
      />
    </Form>
  );
}
