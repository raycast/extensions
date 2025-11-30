import {
  Action,
  ActionPanel,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  closeMainWindow,
  Form,
  useNavigation,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import untildify from "untildify";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

interface Preferences {
  csvFilePath: string;
  defaultExpandTilde: boolean;
}

interface PathEntry {
  slug: string;
  description: string;
  path: string;
  expandedPath: string;
}

function detectDelimiter(content: string): string {
  return content.includes("\t") ? "\t" : ",";
}

function parseCSV(content: string): PathEntry[] {
  const delimiter = detectDelimiter(content);
  const records = parse(content, {
    delimiter,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const entries: PathEntry[] = [];
  for (const record of records) {
    if (record.length >= 3) {
      const slug = record[0];
      const description = record[1];
      const path = record.slice(2).join(delimiter);

      entries.push({
        slug,
        description,
        path,
        expandedPath: untildify(path),
      });
    }
  }

  return entries;
}

async function saveEntries(
  csvPath: string,
  entries: PathEntry[],
  content: string,
): Promise<void> {
  const delimiter = detectDelimiter(content);
  const records = entries.map((entry) => [
    entry.slug,
    entry.description,
    entry.path,
  ]);
  const output = stringify(records, { delimiter });
  await writeFile(csvPath, output, "utf-8");
}

function EditEntryForm({
  entry,
  onSave,
}: {
  entry?: PathEntry;
  onSave: (slug: string, description: string, path: string) => Promise<void>;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: {
    slug: string;
    description: string;
    path: string;
  }) {
    await onSave(values.slug, values.description, values.path);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={entry ? "Save Changes" : "Add Entry"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="slug"
        title="Name"
        placeholder="docs"
        defaultValue={entry?.slug}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Documentation folder"
        defaultValue={entry?.description}
      />
      <Form.TextField
        id="path"
        title="Path"
        placeholder="~/Documents/"
        defaultValue={entry?.path}
      />
    </Form>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [entries, setEntries] = useState<PathEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keepTilde, setKeepTilde] = useState(preferences.defaultExpandTilde);
  const [fileContent, setFileContent] = useState("");
  const { push } = useNavigation();

  async function loadEntries() {
    try {
      const csvPath = untildify(preferences.csvFilePath);
      let content: string;

      try {
        content = await readFile(csvPath, "utf-8");
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          await mkdir(dirname(csvPath), { recursive: true });
          content = "";
          await writeFile(csvPath, content, "utf-8");
          await showToast({
            style: Toast.Style.Success,
            title: "Created empty catalog file",
            message: csvPath,
          });
        } else {
          throw error;
        }
      }

      setFileContent(content);
      const parsedEntries = parseCSV(content);
      setEntries(parsedEntries);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load CSV/TSV",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, [preferences.csvFilePath]);

  async function handleSaveEntry(
    slug: string,
    description: string,
    path: string,
    originalSlug?: string,
  ) {
    const csvPath = untildify(preferences.csvFilePath);
    let updatedEntries: PathEntry[];

    if (originalSlug) {
      updatedEntries = entries.map((e) =>
        e.slug === originalSlug
          ? { slug, description, path, expandedPath: untildify(path) }
          : e,
      );
    } else {
      updatedEntries = [
        ...entries,
        { slug, description, path, expandedPath: untildify(path) },
      ];
    }

    await saveEntries(csvPath, updatedEntries, fileContent);
    await loadEntries();
    await showToast({
      style: Toast.Style.Success,
      title: originalSlug ? "Entry updated" : "Entry added",
    });
  }

  async function handleDeleteEntry(slug: string) {
    if (
      await confirmAlert({
        title: "Delete entry?",
        message: `Delete "${slug}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const csvPath = untildify(preferences.csvFilePath);
      const updatedEntries = entries.filter((e) => e.slug !== slug);
      await saveEntries(csvPath, updatedEntries, fileContent);
      await loadEntries();
      await showToast({ style: Toast.Style.Success, title: "Entry deleted" });
    }
  }

  async function handleMoveEntry(slug: string, direction: "up" | "down") {
    const index = entries.findIndex((e) => e.slug === slug);
    if (
      (direction === "up" && index > 0) ||
      (direction === "down" && index < entries.length - 1)
    ) {
      const newEntries = [...entries];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      [newEntries[index], newEntries[targetIndex]] = [
        newEntries[targetIndex],
        newEntries[index],
      ];
      const csvPath = untildify(preferences.csvFilePath);
      await saveEntries(csvPath, newEntries, fileContent);
      await loadEntries();
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search paths by slug...">
      <List.EmptyView
        title="No paths yet"
        description="Press Cmd+N to add your first path"
        actions={
          <ActionPanel>
            <Action
              title="Add New Entry"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => {
                push(
                  <EditEntryForm
                    onSave={(slug, description, path) =>
                      handleSaveEntry(slug, description, path)
                    }
                  />,
                );
              }}
            />
          </ActionPanel>
        }
      />
      <List.Section title="Paths">
        {entries.map((entry) => {
          const pathToUse = keepTilde ? entry.path : entry.expandedPath;
          return (
            <List.Item
              key={entry.slug}
              title={entry.slug}
              subtitle={entry.description}
              accessories={[{ text: pathToUse }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Open
                      title="Search Files in Path"
                      target={`raycast://extensions/raycast/file-search/search-files?fallbackText=${encodeURIComponent(entry.path)}`}
                      application="com.raycast.macos"
                      icon={Icon.MagnifyingGlass}
                      shortcut={{ modifiers: [], key: "return" }}
                    />
                    <Action.Paste
                      title="Paste to App"
                      content={pathToUse}
                      shortcut={{ modifiers: ["shift"], key: "return" }}
                      onPaste={async () => {
                        await closeMainWindow();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Path pasted",
                        });
                      }}
                    />
                    <Action
                      title="Toggle Tilde Expansion"
                      shortcut={{ modifiers: [], key: "tab" }}
                      onAction={() => setKeepTilde(!keepTilde)}
                    />
                    <Action.CopyToClipboard
                      title="Copy to Clipboard"
                      content={pathToUse}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onCopy={async () => {
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Path copied to clipboard",
                        });
                      }}
                    />
                    <Action.CopyToClipboard
                      title={
                        keepTilde ? "Copy Expanded" : "Copy with Tilde (~)"
                      }
                      content={keepTilde ? entry.expandedPath : entry.path}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onCopy={async () => {
                        await showToast({
                          style: Toast.Style.Success,
                          title: keepTilde
                            ? "Path copied (expanded)"
                            : "Path copied (with ~)",
                        });
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Edit Entry"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() => {
                        push(
                          <EditEntryForm
                            entry={entry}
                            onSave={(slug, description, path) =>
                              handleSaveEntry(
                                slug,
                                description,
                                path,
                                entry.slug,
                              )
                            }
                          />,
                        );
                      }}
                    />
                    <Action
                      title="Add New Entry"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() => {
                        push(
                          <EditEntryForm
                            onSave={(slug, description, path) =>
                              handleSaveEntry(slug, description, path)
                            }
                          />,
                        );
                      }}
                    />
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDeleteEntry(entry.slug)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Move up"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                      onAction={() => handleMoveEntry(entry.slug, "up")}
                    />
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={{
                        modifiers: ["cmd", "shift"],
                        key: "arrowDown",
                      }}
                      onAction={() => handleMoveEntry(entry.slug, "down")}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
