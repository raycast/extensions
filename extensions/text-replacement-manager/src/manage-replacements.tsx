import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  environment,
  Form,
  Icon,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { useEffect, useMemo, useState } from "react";

import {
  exportReplacementsToJson,
  parseImportedReplacements,
} from "./lib/import-export";
import {
  cloneReplacement,
  createReplacement,
  deleteReplacement,
  updateReplacement,
} from "./lib/operations";
import {
  replacementListRow,
  type ReplacementListRowTag,
} from "./lib/replacement-list-row";
import { SystemReplacementStore } from "./lib/system-store";
import {
  normalizeTagColors,
  tagColorFor,
  TAG_COLOR_OPTIONS,
  type TagColorName,
  type TagColorsByTag,
} from "./lib/tag-colors";
import type { ReplacementInput, TextReplacement } from "./lib/types";
import {
  applyTagSuggestion,
  normalizeTags,
  suggestTags,
  triggerPattern,
} from "./lib/validation";

const store = new SystemReplacementStore({
  supportPath: environment.supportPath,
});
const TAG_COLORS_STORAGE_KEY = "tag-colors";
const raycastColors: Record<TagColorName, Color> = {
  SecondaryText: Color.SecondaryText,
  Blue: Color.Blue,
  Green: Color.Green,
  Magenta: Color.Magenta,
  Orange: Color.Orange,
  Purple: Color.Purple,
  Red: Color.Red,
  Yellow: Color.Yellow,
};

export default function Command() {
  const [replacements, setReplacements] = useState<TextReplacement[]>([]);
  const [tagColors, setTagColors] = useState<TagColorsByTag>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const existingTags = useMemo(() => uniqueTags(replacements), [replacements]);

  async function reload() {
    setIsLoading(true);
    setError(undefined);
    try {
      setReplacements(await store.readAll());
    } catch (caught) {
      const message = formatError(caught);
      setError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read Text Replacements",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    async function loadTagColors() {
      const stored = await LocalStorage.getItem<string>(TAG_COLORS_STORAGE_KEY);
      setTagColors(normalizeTagColors(parseJson(stored), existingTags));
    }

    void loadTagColors();
  }, [existingTags]);

  async function persist(next: TextReplacement[], title: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await store.replaceAll(next);
      setReplacements(await store.readAll());
      toast.style = Toast.Style.Success;
      toast.title = "Synced Text Replacements";
    } catch (caught) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sync failed";
      toast.message = `${formatError(caught)} Apple supports importing/exporting replacements from System Settings > Keyboard > Text Replacements.`;
    }
  }

  async function persistTagColors(next: TagColorsByTag) {
    const normalized = normalizeTagColors(next, existingTags);
    await LocalStorage.setItem(
      TAG_COLORS_STORAGE_KEY,
      JSON.stringify(normalized),
    );
    setTagColors(normalized);
    await showToast({
      style: Toast.Style.Success,
      title: "Updated Tag Colors",
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Text Replacements and tags"
      navigationTitle="Text Replacement Manager"
      actions={
        <GlobalActions
          replacements={replacements}
          tagColors={tagColors}
          onReload={reload}
          onPersist={persist}
          onPersistTagColors={persistTagColors}
        />
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Unable to Read Text Replacements"
          description={error}
        />
      ) : replacements.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Text}
          title="No Text Replacements Found"
          description="Create one from Raycast or import a JSON file."
          actions={
            <GlobalActions
              replacements={replacements}
              tagColors={tagColors}
              onReload={reload}
              onPersist={persist}
              onPersistTagColors={persistTagColors}
            />
          }
        />
      ) : (
        replacements.map((replacement) => (
          <ReplacementItem
            key={replacement.uuid}
            replacement={replacement}
            replacements={replacements}
            tagColors={tagColors}
            onPersist={persist}
            onPersistTagColors={persistTagColors}
          />
        ))
      )}
    </List>
  );
}

function ReplacementItem(props: {
  replacement: TextReplacement;
  replacements: TextReplacement[];
  tagColors: TagColorsByTag;
  onPersist(next: TextReplacement[], title: string): Promise<void>;
  onPersistTagColors(next: TagColorsByTag): Promise<void>;
}) {
  const {
    replacement,
    replacements,
    tagColors,
    onPersist,
    onPersistTagColors,
  } = props;
  const row = replacementListRow(replacement, tagColors);

  return (
    <List.Item
      icon={statusIcon(row.status)}
      title={{ value: row.trigger, tooltip: row.trigger }}
      subtitle={{ value: row.replacementText, tooltip: row.replacementText }}
      keywords={row.keywords}
      accessories={tagAccessories(row.tags)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Pencil}
              title="Edit Replacement"
              target={
                <ReplacementForm
                  title="Edit Text Replacement"
                  submitTitle="Save Replacement"
                  existing={replacements}
                  initialReplacement={replacement}
                  onSubmit={(input) =>
                    onPersist(
                      updateReplacement(replacements, replacement.uuid, input),
                      "Updating replacement",
                    )
                  }
                />
              }
            />
            <Action.Push
              icon={Icon.Duplicate}
              title="Clone Replacement"
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={
                <ReplacementForm
                  title="Clone Text Replacement"
                  submitTitle="Create Clone"
                  existing={replacements}
                  initialReplacement={{
                    ...replacement,
                    trigger: `${replacement.trigger}-copy`,
                  }}
                  forceCreate
                  onSubmit={(input) =>
                    onPersist(
                      cloneReplacement(replacements, replacement.uuid, input),
                      "Cloning replacement",
                    )
                  }
                />
              }
            />
            <Action
              icon={Icon.Trash}
              title="Delete Replacement"
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Text Replacement?",
                    message: `${replacement.trigger} -> ${replacement.replacementText}`,
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  })
                ) {
                  await onPersist(
                    deleteReplacement(replacements, replacement.uuid),
                    "Deleting replacement",
                  );
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Trigger"
              content={replacement.trigger}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Replacement Text"
              content={replacement.replacementText}
            />
            <Action.CopyToClipboard
              title="Copy Replacement JSON"
              content={exportReplacementsToJson([replacement])}
            />
            <Action
              icon={Icon.Download}
              title="Export Selected JSON"
              onAction={() =>
                exportToSupportPath(
                  [replacement],
                  `text-replacement-${replacement.trigger}.json`,
                )
              }
            />
          </ActionPanel.Section>
          <GlobalActionSections
            replacements={replacements}
            tagColors={tagColors}
            onPersist={onPersist}
            onPersistTagColors={onPersistTagColors}
          />
        </ActionPanel>
      }
    />
  );
}

function statusIcon(status: "enabled" | "disabled") {
  return status === "enabled"
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
}

function tagAccessories(tags: ReplacementListRowTag[]): List.Item.Accessory[] {
  return tags.length
    ? tags.map((tag) => ({
        tag: { value: tag.name, color: raycastColorForTag(tag.color) },
        tooltip: `${tag.name} tag`,
      }))
    : [{ text: { value: "No tags", color: Color.SecondaryText } }];
}

function raycastColorForTag(
  color: ReplacementListRowTag["color"],
): Color.ColorLike {
  return color in raycastColors ? raycastColors[color as TagColorName] : color;
}

function GlobalActions(props: {
  replacements: TextReplacement[];
  tagColors: TagColorsByTag;
  onReload?: () => Promise<void>;
  onPersist(next: TextReplacement[], title: string): Promise<void>;
  onPersistTagColors(next: TagColorsByTag): Promise<void>;
}) {
  return (
    <ActionPanel>
      <GlobalActionSections {...props} />
    </ActionPanel>
  );
}

function GlobalActionSections(props: {
  replacements: TextReplacement[];
  tagColors: TagColorsByTag;
  onReload?: () => Promise<void>;
  onPersist(next: TextReplacement[], title: string): Promise<void>;
  onPersistTagColors(next: TagColorsByTag): Promise<void>;
}) {
  const { replacements, tagColors, onReload, onPersist, onPersistTagColors } =
    props;
  const existingTags = uniqueTags(replacements);

  return (
    <>
      <ActionPanel.Section>
        <Action.Push
          icon={Icon.Plus}
          title="Create Text Replacement"
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={
            <ReplacementForm
              title="Create Text Replacement"
              submitTitle="Create Replacement"
              existing={replacements}
              onSubmit={(input) =>
                onPersist(
                  createReplacement(replacements, input),
                  "Creating replacement",
                )
              }
            />
          }
        />
        <Action.Push
          icon={Icon.Tag}
          title="Set Tag Colors"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          target={
            <TagColorsForm
              tags={existingTags}
              tagColors={tagColors}
              onSubmit={onPersistTagColors}
            />
          }
        />
        <Action.Push
          icon={Icon.Upload}
          title="Import JSON"
          target={
            <ImportForm
              existing={replacements}
              onImport={(imported) =>
                onPersist(
                  [...replacements, ...imported],
                  "Importing replacements",
                )
              }
            />
          }
        />
        <Action
          icon={Icon.Download}
          title="Export All JSON"
          onAction={() =>
            exportToSupportPath(replacements, "text-replacements.json")
          }
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {onReload ? (
          <Action
            icon={Icon.ArrowClockwise}
            title="Reload from macOS"
            onAction={onReload}
          />
        ) : null}
        <Action
          icon={Icon.Gear}
          title="Open macOS Text Replacement Settings"
          onAction={openTextReplacementSettings}
        />
      </ActionPanel.Section>
    </>
  );
}

function TagColorsForm(props: {
  tags: string[];
  tagColors: TagColorsByTag;
  onSubmit(next: TagColorsByTag): Promise<void>;
}) {
  const { pop } = useNavigation();

  async function submit(values: Record<string, string>) {
    await props.onSubmit(normalizeTagColors(values, props.tags));
    pop();
  }

  return (
    <Form
      navigationTitle="Set Tag Colors"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.CheckCircle}
            title="Save Tag Colors"
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      {props.tags.length ? (
        props.tags.map((tag) => (
          <Form.Dropdown
            key={tag}
            id={tag}
            title={tag}
            defaultValue={tagColorFor(tag, props.tagColors)}
          >
            {TAG_COLOR_OPTIONS.map((color) => (
              <Form.Dropdown.Item
                key={color}
                value={color}
                title={color === "SecondaryText" ? "Default" : color}
                icon={{ source: Icon.Circle, tintColor: raycastColors[color] }}
              />
            ))}
          </Form.Dropdown>
        ))
      ) : (
        <Form.Description
          title="No Tags"
          text="Create or edit a replacement with tags before assigning colors."
        />
      )}
    </Form>
  );
}

interface ReplacementFormValues {
  trigger: string;
  replacementText: string;
  tags: string;
}

function ReplacementForm(props: {
  title: string;
  submitTitle: string;
  existing: TextReplacement[];
  initialReplacement?: TextReplacement;
  forceCreate?: boolean;
  onSubmit(input: ReplacementInput): Promise<void>;
}) {
  const { pop } = useNavigation();
  const editingUuid = props.forceCreate
    ? undefined
    : props.initialReplacement?.uuid;
  const existingTags = useMemo(() => {
    return [...new Set(props.existing.flatMap((item) => item.tags))].sort(
      (a, b) => a.localeCompare(b),
    );
  }, [props.existing]);
  const { handleSubmit, itemProps, values, setValue, focus } =
    useForm<ReplacementFormValues>({
      initialValues: {
        trigger: props.initialReplacement?.trigger ?? "",
        replacementText: props.initialReplacement?.replacementText ?? "",
        tags: props.initialReplacement?.tags.join(", ") ?? "",
      },
      validation: {
        trigger: (value) => {
          const trigger = value?.trim() ?? "";
          if (!triggerPattern.test(trigger)) {
            return "Trigger must be 1-64 non-whitespace characters.";
          }
          if (
            props.existing.some(
              (item) =>
                item.trigger === trigger &&
                item.uuid !== editingUuid &&
                item.replacementText !== values.replacementText,
            )
          ) {
            return "Trigger must be unique.";
          }
        },
        replacementText: FormValidation.Required,
      },
      async onSubmit(values) {
        await props.onSubmit({
          trigger: values.trigger,
          replacementText: values.replacementText,
          tags: normalizeTags(values.tags),
        });
        pop();
      },
    });
  const tagSuggestions = useMemo(
    () => suggestTags(values.tags, existingTags),
    [existingTags, values.tags],
  );
  const topTagSuggestion = tagSuggestions[0];

  function acceptTagSuggestion(tag: string) {
    setValue("tags", applyTagSuggestion(values.tags, tag));
    focus("tags");
  }

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          {topTagSuggestion ? (
            <Action
              icon={Icon.Plus}
              title={`Use Tag "${topTagSuggestion}"`}
              shortcut={{ modifiers: [], key: "return" }}
              onAction={() => acceptTagSuggestion(topTagSuggestion)}
            />
          ) : null}
          <Action.SubmitForm
            icon={Icon.CheckCircle}
            title={props.submitTitle}
            shortcut={{ modifiers: [], key: "return" }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Trigger"
        placeholder="omw"
        {...itemProps.trigger}
      />
      <Form.TextArea
        title="Replacement Text"
        placeholder="On my way!"
        {...itemProps.replacementText}
      />
      <Form.TextField
        title="Tags"
        placeholder="personal, travel"
        {...itemProps.tags}
      />
      {tagSuggestions.length ? (
        <Form.Description
          title="Matching Tags"
          text={tagSuggestions.join(", ")}
        />
      ) : null}
    </Form>
  );
}

function ImportForm(props: {
  existing: TextReplacement[];
  onImport(imported: TextReplacement[]): Promise<void>;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ files: string[] }>({
    validation: {
      files: (value) => {
        if (!value?.length) {
          return "Choose a JSON file to import.";
        }
      },
    },
    async onSubmit(values) {
      try {
        const file = values.files[0];
        const { accepted, skipped } = parseImportedReplacements(
          await readFile(file, "utf8"),
          props.existing,
        );
        await props.onImport(accepted);
        await showToast({
          style: Toast.Style.Success,
          title: "Imported Text Replacements",
          message: skipped.length
            ? `Skipped existing: ${skipped.join(", ")}`
            : undefined,
        });
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Import failed",
          message: formatError(error),
        });
      }
    },
  });

  return (
    <Form
      navigationTitle="Import Text Replacements"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Upload}
            title="Import JSON"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="JSON File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        {...itemProps.files}
      />
    </Form>
  );
}

async function exportToSupportPath(
  replacements: TextReplacement[],
  fileName: string,
) {
  const exportsPath = join(environment.supportPath, "exports");
  await mkdir(exportsPath, { recursive: true });
  const outputPath = join(exportsPath, sanitizeFileName(fileName));
  await writeFile(outputPath, exportReplacementsToJson(replacements), "utf8");
  await Clipboard.copy(outputPath);
  await showToast({
    style: Toast.Style.Success,
    title: "Exported JSON",
    message: "File path copied to clipboard",
    primaryAction: {
      title: "Open Exported JSON",
      onAction: async (toast) => {
        await open(outputPath);
        toast.hide();
      },
    },
  });
}

async function openTextReplacementSettings() {
  await open("x-apple.systempreferences:com.apple.Keyboard-Settings.extension");
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-z0-9._-]/gi, "-");
}

function uniqueTags(replacements: TextReplacement[]): string[] {
  return [...new Set(replacements.flatMap((item) => item.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function parseJson(value: string | undefined): unknown {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
