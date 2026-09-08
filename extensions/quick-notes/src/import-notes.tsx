import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useAtom } from "jotai";
import { Note, notesAtom, tagsAtom, Tag } from "./services/atoms";
import { parseMarkdownNote } from "./utils/frontmatter";
import { getInitialValuesFromFile, getRandomColor, getTintColor } from "./utils/utils";
import { TAGS_FILE_PATH } from "./services/config";
import fs from "node:fs";
import path from "node:path";

const getH1Title = (body: string): string | undefined => {
  const firstLine = body.split("\n", 1)[0]?.trim();
  const match = firstLine?.match(/^#\s+(.+)$/);
  return match?.[1].trim();
};

const makeUniqueTitle = (base: string, taken: Set<string>): string => {
  if (!taken.has(base)) {
    return base;
  }
  let i = 1;
  while (taken.has(`${base} (${i})`)) {
    i++;
  }
  return `${base} (${i})`;
};

const makeUniqueDate = (date: Date, taken: Set<number>): Date => {
  while (taken.has(date.getTime())) {
    date = new Date(date.getTime() + 1);
  }
  return date;
};

const importFile = (filePath: string, takenTitles: Set<string>, takenDates: Set<number>): Note => {
  const parsed = parseMarkdownNote(fs.readFileSync(filePath, "utf-8"));

  const fileName = path.basename(filePath, ".md").trim();
  const title = makeUniqueTitle(fileName || getH1Title(parsed.body) || "Untitled note", takenTitles);
  takenTitles.add(title);

  const stats = fs.statSync(filePath);
  const birthtime = stats.birthtime;
  const baseDate = parsed.createdAt ?? (birthtime && !isNaN(birthtime.getTime()) ? birthtime : new Date());
  const createdAt = makeUniqueDate(baseDate, takenDates);
  takenDates.add(createdAt.getTime());

  return {
    title,
    icon: parsed.icon ?? "Document",
    body: parsed.body,
    tags: parsed.tags ?? [],
    is_draft: false,
    createdAt,
    updatedAt: new Date(),
  };
};

export default function ImportNotes() {
  const [notes, setNotes] = useAtom(notesAtom);
  const [, setTags] = useAtom(tagsAtom);

  return (
    <Form
      navigationTitle="Import Notes"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import Notes"
            icon={{ source: Icon.Download, tintColor: getTintColor("green") }}
            onSubmit={async (values: { files: string[] }) => {
              const files = values.files ?? [];
              const markdownFiles = files.filter((file) => file.toLowerCase().endsWith(".md"));
              if (markdownFiles.length === 0) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "No Markdown Files",
                  message: "Only .md files can be imported",
                });
                return;
              }

              const takenTitles = new Set(notes.map((note) => note.title));
              const takenDates = new Set(notes.map((note) => new Date(note.createdAt).getTime()));
              const imported: Note[] = [];
              const failed: string[] = [];
              for (const file of markdownFiles) {
                try {
                  imported.push(importFile(file, takenTitles, takenDates));
                } catch {
                  failed.push(path.basename(file));
                }
              }

              // Register tags found in imported frontmatter so they show up in Manage Tags and the filter dropdown
              const tags = getInitialValuesFromFile(TAGS_FILE_PATH) as Tag[];
              const knownTags = new Set(tags.map((tag) => tag.name));
              const importedTags = imported.flatMap((note) => note.tags).filter((tag) => !knownTags.has(tag));
              if (importedTags.length > 0) {
                await setTags([
                  ...tags,
                  ...[...new Set(importedTags)].map((name) => ({ name, color: getRandomColor().name })),
                ]);
              }

              await setNotes([...notes, ...imported]);

              const skipped = files.length - markdownFiles.length;
              if (imported.length === 0) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Import Failed",
                  message: `Could not read ${failed.join(", ")}`,
                });
                popToRoot();
                return;
              }

              const warnings = [
                skipped > 0 ? `${skipped} non-markdown file${skipped > 1 ? "s" : ""} skipped` : "",
                failed.length > 0 ? `${failed.length} file${failed.length > 1 ? "s" : ""} could not be read` : "",
              ].filter(Boolean);
              showToast({
                style: Toast.Style.Success,
                title: `${imported.length} Note${imported.length > 1 ? "s" : ""} Imported`,
                message: warnings.join(", ") || undefined,
              });
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Choose Markdown Files"
        info="Only .md files will be imported"
        allowMultipleSelection
      />
    </Form>
  );
}
