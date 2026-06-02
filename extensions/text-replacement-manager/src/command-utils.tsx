import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  environment,
  Form,
  Icon,
  List,
  LocalStorage,
  open,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { useEffect, useMemo, useState } from "react";

import {
  exportReplacementsToJson,
  parseImportedReplacements,
} from "./lib/import-export";
import type { ReplacementListRowTag } from "./lib/replacement-list-row";
import { SystemReplacementStore } from "./lib/system-store";
import {
  DEFAULT_TAG_COLOR,
  normalizeTagColorFormValues,
  normalizeTagColors,
  tagColorFieldId,
  tagColorFor,
  type TagColorName,
  type TagColorsByTag,
} from "./lib/tag-colors";
import type { TextReplacement } from "./lib/types";
import { normalizeTags, suggestTags } from "./lib/validation";

const store = new SystemReplacementStore({
  supportPath: environment.supportPath,
});
const TAG_COLORS_STORAGE_KEY = "tag-colors";

export const raycastColors: Record<TagColorName, Color> = {
  SecondaryText: Color.SecondaryText,
  Magenta: Color.Magenta,
  Purple: Color.Purple,
  Blue: Color.Blue,
  Green: Color.Green,
  Yellow: Color.Yellow,
  Orange: Color.Orange,
  Red: Color.Red,
};

export function useTextReplacements() {
  const [replacements, setReplacements] = useState<TextReplacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

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

  return {
    replacements,
    isLoading,
    error,
    reload,
    persist,
  };
}

export function useTagColors(replacements: TextReplacement[]) {
  const [tagColors, setTagColors] = useState<TagColorsByTag>({});
  const existingTags = useMemo(() => uniqueTags(replacements), [replacements]);

  useEffect(() => {
    async function loadTagColors() {
      const stored = await LocalStorage.getItem<string>(TAG_COLORS_STORAGE_KEY);
      setTagColors(normalizeTagColors(parseJson(stored), existingTags));
    }

    void loadTagColors();
  }, [existingTags]);

  async function persistTagColors(next: TagColorsByTag, tags = existingTags) {
    const normalized = normalizeTagColors(next, tags);
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

  return {
    existingTags,
    tagColors,
    persistTagColors,
  };
}

export function tagAccessories(
  tags: ReplacementListRowTag[],
): List.Item.Accessory[] {
  return tags.length
    ? tags.map((tag) => ({
        tag: { value: tag.name, color: raycastColorForTag(tag.color) },
        tooltip: `${tag.name} tag`,
      }))
    : [{ text: { value: "No tags", color: Color.SecondaryText } }];
}

export function raycastColorForTag(
  color: ReplacementListRowTag["color"],
): Color.ColorLike {
  return color in raycastColors ? raycastColors[color as TagColorName] : color;
}

export function selectedAddTagTitle(selectedCount: number): string {
  return `Add Tag to ${selectedCount} Selected Replacement${
    selectedCount === 1 ? "" : "s"
  }`;
}

interface AddTagFormValues {
  tag: string;
}

export function AddTagForm(props: {
  existingTags: string[];
  onSubmit(tag: string): Promise<void>;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, values, setValue, focus } =
    useForm<AddTagFormValues>({
      initialValues: {
        tag: "",
      },
      validation: {
        tag: (value) => {
          if (normalizeTags(value).length !== 1) {
            return "Enter exactly one tag.";
          }
        },
      },
      async onSubmit(values) {
        await props.onSubmit(values.tag);
        pop();
      },
    });
  const tagSuggestions = useMemo(
    () => suggestTags(values.tag, props.existingTags),
    [props.existingTags, values.tag],
  );
  const topTagSuggestion = tagSuggestions[0];

  function acceptTagSuggestion(tag: string) {
    setValue("tag", tag);
    focus("tag");
  }

  return (
    <Form
      navigationTitle="Add Tag to Replacements"
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
            icon={Icon.Tag}
            title="Add Tag"
            shortcut={{ modifiers: [], key: "return" }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Tag" placeholder="personal" {...itemProps.tag} />
      {tagSuggestions.length ? (
        <Form.Description
          title="Matching Tags"
          text={tagSuggestions.join(", ")}
        />
      ) : null}
    </Form>
  );
}

export function TagColorsForm(props: {
  tags: string[];
  tagColors: TagColorsByTag;
  onSubmit(next: TagColorsByTag): Promise<void>;
}) {
  const { pop } = useNavigation();

  async function submit(values: Record<string, string>) {
    await props.onSubmit(normalizeTagColorFormValues(values, props.tags));
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
        props.tags.map((tag, index) => {
          const storedColor = tagColorFor(tag, props.tagColors);

          return (
            <Form.TextField
              key={`${tag}-color`}
              id={tagColorFieldId(index)}
              title={tag}
              placeholder="Default, Blue, #FF0000, red, or rgb(255, 0, 0)"
              defaultValue={
                storedColor === DEFAULT_TAG_COLOR ? "Default" : storedColor
              }
            />
          );
        })
      ) : (
        <Form.Description
          title="No Tags"
          text="Create or edit a replacement with tags before assigning colors."
        />
      )}
    </Form>
  );
}

export function ImportForm(props: {
  existing: TextReplacement[];
  onImport(
    imported: TextReplacement[],
    tagColors: TagColorsByTag,
  ): Promise<void>;
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
        const { accepted, skipped, tagColors } = parseImportedReplacements(
          await readFile(file, "utf8"),
          props.existing,
        );
        await props.onImport(accepted, tagColors);
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

export async function exportToSupportPath(
  replacements: TextReplacement[],
  fileName: string,
  tagColors?: TagColorsByTag,
) {
  const exportsPath = join(environment.supportPath, "exports");
  await mkdir(exportsPath, { recursive: true });
  const outputPath = join(exportsPath, sanitizeFileName(fileName));
  await writeFile(
    outputPath,
    exportReplacementsToJson(replacements, tagColors),
    "utf8",
  );
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
  await popToRoot({ clearSearchBar: true });
}

export async function exportToDirectory(
  replacements: TextReplacement[],
  directory: string,
  fileName: string,
  tagColors?: TagColorsByTag,
) {
  const selected = await stat(directory);
  if (!selected.isDirectory()) {
    throw new Error("Choose a folder for the export destination.");
  }

  const outputPath = join(directory, sanitizeFileName(fileName));
  await writeFile(
    outputPath,
    exportReplacementsToJson(replacements, tagColors),
    "utf8",
  );
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
  await popToRoot({ clearSearchBar: true });
}

export async function openTextReplacementSettings() {
  await open("x-apple.systempreferences:com.apple.Keyboard-Settings.extension");
}

export function uniqueTags(replacements: TextReplacement[]): string[] {
  return [...new Set(replacements.flatMap((item) => item.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-z0-9._-]/gi, "-");
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
