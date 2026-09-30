import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useMemo, useState } from "react";
import type { ActiveState, Demo, Snippet } from "./types";
import { clearActiveState, getActiveState, getDemos, saveDemos, setActiveState } from "./storage";
import { previewText, splitSnippetLines } from "./utils";

export default function ManageDemoSnippets() {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [activeState, setActiveStateValue] = useState<ActiveState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    const [loadedDemos, loadedState] = await Promise.all([getDemos(), getActiveState()]);
    setDemos(loadedDemos);
    setActiveStateValue(loadedState);
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const activeDemoId = activeState?.demoId ?? null;
  const { pinnedDemos, unpinnedDemos, pinnedCount, orderedDemos } = useMemo(() => {
    const pinned: Demo[] = [];
    const unpinned: Demo[] = [];
    for (const demo of demos) {
      if (demo.pinned) {
        pinned.push(demo);
      } else {
        unpinned.push(demo);
      }
    }
    return {
      pinnedDemos: pinned,
      unpinnedDemos: unpinned,
      pinnedCount: pinned.length,
      orderedDemos: [...pinned, ...unpinned],
    };
  }, [demos]);

  const renderDemoItem = (demo: Demo, index: number) => {
    const accessories = activeDemoId === demo.id ? [{ icon: Icon.Play, tooltip: "Active Demo" }] : [];
    const isPinned = Boolean(demo.pinned);
    const groupIndex = isPinned ? index : index - pinnedCount;
    const groupSize = isPinned ? pinnedCount : orderedDemos.length - pinnedCount;

    return (
      <List.Item
        key={demo.id}
        title={demo.name}
        subtitle={`${demo.snippets.length} snippet${demo.snippets.length === 1 ? "" : "s"}`}
        accessories={accessories.length > 0 ? accessories : undefined}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Demo"
              icon={Icon.List}
              target={<DemoSnippetsView demoId={demo.id} onUpdate={refresh} />}
            />
            <Action
              title={activeDemoId === demo.id ? "Stop Demo" : "Start Demo"}
              icon={activeDemoId === demo.id ? Icon.Stop : Icon.Play}
              onAction={async () => {
                if (activeDemoId === demo.id) {
                  await clearActiveState();
                  await refresh();
                  await showToast({ style: Toast.Style.Success, title: "Demo stopped" });
                  return;
                }
                await setActiveState({ demoId: demo.id, index: 0 });
                await refresh();
                await showToast({ style: Toast.Style.Success, title: "Demo started" });
              }}
            />
            <Action.Push
              title="Create Demo"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<DemoForm mode="create" demos={demos} onSave={refresh} />}
            />
            <Action
              title={demo.pinned ? "Unpin Demo" : "Pin Demo"}
              icon={Icon.Pin}
              onAction={async () => {
                const now = Date.now();
                const updated = orderedDemos.map((item) =>
                  item.id === demo.id ? { ...item, pinned: !item.pinned, updatedAt: now } : item,
                );
                await saveDemos(orderDemos(updated));
                await refresh();
                await showToast({
                  style: Toast.Style.Success,
                  title: demo.pinned ? "Demo unpinned" : "Demo pinned",
                });
              }}
            />
            <Action
              title="Move up"
              icon={Icon.ArrowUp}
              shortcut={{ modifiers: ["opt", "cmd"], key: "arrowUp" }}
              onAction={async () => {
                if (groupIndex <= 0) {
                  return;
                }
                const updated = moveDemo(orderedDemos, index, index - 1);
                await saveDemos(updated);
                await refresh();
              }}
            />
            <Action
              title="Move Down"
              icon={Icon.ArrowDown}
              shortcut={{ modifiers: ["opt", "cmd"], key: "arrowDown" }}
              onAction={async () => {
                if (groupIndex >= groupSize - 1) {
                  return;
                }
                const updated = moveDemo(orderedDemos, index, index + 1);
                await saveDemos(updated);
                await refresh();
              }}
            />
            <Action.Push
              title="Rename Demo"
              icon={Icon.Pencil}
              target={<DemoForm mode="rename" demo={demo} demos={demos} onSave={refresh} />}
            />
            <Action
              title="Export Demo"
              icon={Icon.Download}
              onAction={async () => {
                try {
                  const outputPath = await exportDemoToFile(demo);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Exported demo",
                    message: outputPath,
                  });
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to export demo",
                    message: String(error),
                  });
                }
              }}
            />
            <Action
              title="Delete Demo"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const shouldDelete = await confirmAlert({
                  title: "Delete demo",
                  message: `Delete "${demo.name}"? This cannot be undone.`,
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!shouldDelete) {
                  return;
                }
                const updated = demos.filter((item) => item.id !== demo.id);
                await saveDemos(orderDemos(updated));
                if (activeDemoId === demo.id) {
                  await clearActiveState();
                }
                await refresh();
                await showToast({ style: Toast.Style.Success, title: "Demo deleted" });
              }}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search demos">
      {pinnedDemos.length > 0 && (
        <List.Section title="Pinned">{pinnedDemos.map((demo, index) => renderDemoItem(demo, index))}</List.Section>
      )}
      {unpinnedDemos.length > 0 && (
        <List.Section title="Demos">
          {unpinnedDemos.map((demo, index) => renderDemoItem(demo, index + pinnedCount))}
        </List.Section>
      )}
      <List.EmptyView
        title="No demos yet"
        description="Create a demo to start adding snippets."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Demo"
              icon={Icon.Plus}
              target={<DemoForm mode="create" demos={demos} onSave={refresh} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function DemoForm({
  mode,
  demo,
  demos,
  onSave,
}: {
  mode: "create" | "rename";
  demo?: Demo;
  demos: Demo[];
  onSave: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(demo?.name ?? "");

  return (
    <Form
      navigationTitle={mode === "create" ? "Create Demo" : "Rename Demo"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "create" ? "Create Demo" : "Save Changes"}
            onSubmit={async () => {
              const trimmed = name.trim();
              if (!trimmed) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Demo name is required",
                });
                return;
              }
              if (demos.some((item) => item.name.toLowerCase() === trimmed.toLowerCase() && item.id !== demo?.id)) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Demo name already exists",
                });
                return;
              }
              const now = Date.now();
              let updated: Demo[];
              if (mode === "create") {
                const newDemo: Demo = {
                  id: randomUUID(),
                  name: trimmed,
                  snippets: [],
                  pinned: false,
                  createdAt: now,
                  updatedAt: now,
                };
                updated = [...demos, newDemo];
              } else {
                updated = demos.map((item) =>
                  item.id === demo?.id
                    ? {
                        ...item,
                        name: trimmed,
                        updatedAt: now,
                      }
                    : item,
                );
              }
              await saveDemos(orderDemos(updated));
              await onSave();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Demo Name" placeholder="Live Demo" value={name} onChange={setName} autoFocus />
    </Form>
  );
}

function DemoSnippetsView({ demoId, onUpdate }: { demoId: string; onUpdate: () => Promise<void> }) {
  const [demo, setDemo] = useState<Demo | null>(null);
  const [demos, setDemos] = useState<Demo[]>([]);
  const [activeState, setActiveStateValue] = useState<ActiveState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    const [loadedDemos, loadedState] = await Promise.all([getDemos(), getActiveState()]);
    setDemos(loadedDemos);
    setActiveStateValue(loadedState);
    setDemo(loadedDemos.find((item) => item.id === demoId) ?? null);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, [demoId]);

  const activeDemoId = activeState?.demoId ?? null;

  const snippetItems = useMemo(() => {
    if (!demo) {
      return [];
    }
    return demo.snippets.map((snippet, index) => ({ snippet, index }));
  }, [demo]);

  if (!demo && !isLoading) {
    return <List.EmptyView title="Demo not found" />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={demo ? `Snippets - ${demo.name}` : "Snippets"}
      searchBarPlaceholder="Search snippets"
    >
      {snippetItems.map(({ snippet, index }) => (
        <List.Item
          key={snippet.id}
          title={previewText(snippet.text)}
          subtitle={`#${index + 1}`}
          accessories={
            activeDemoId === demo?.id && activeState?.index === index
              ? [{ icon: Icon.ArrowRight, tooltip: "Next snippet" }]
              : undefined
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Snippet"
                icon={Icon.Pencil}
                target={
                  <SnippetForm
                    mode="edit"
                    demoId={demo?.id ?? ""}
                    snippet={snippet}
                    onSave={async () => {
                      await load();
                      await onUpdate();
                    }}
                  />
                }
              />
              <Action.Push
                title="Add Snippet"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={
                  <SnippetForm
                    mode="create"
                    demoId={demo?.id ?? ""}
                    onSave={async () => {
                      await load();
                      await onUpdate();
                    }}
                  />
                }
              />
              <Action
                title="Delete Snippet"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (!demo) {
                    return;
                  }
                  const shouldDelete = await confirmAlert({
                    title: "Delete snippet",
                    message: "This cannot be undone.",
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  });
                  if (!shouldDelete) {
                    return;
                  }
                  const updatedSnippets = demo.snippets.filter((item) => item.id !== snippet.id);
                  await persistDemoChanges(demo.id, demos, {
                    snippets: updatedSnippets,
                  });
                  await load();
                  await onUpdate();
                  await showToast({ style: Toast.Style.Success, title: "Snippet deleted" });
                }}
              />
              <Action
                title="Move up"
                icon={Icon.ArrowUp}
                shortcut={{ modifiers: ["opt", "cmd"], key: "arrowUp" }}
                onAction={async () => {
                  if (!demo || index === 0) {
                    return;
                  }
                  const updated = moveSnippet(demo.snippets, index, index - 1);
                  await persistDemoChanges(demo.id, demos, { snippets: updated });
                  await load();
                  await onUpdate();
                }}
              />
              <Action
                title="Move Down"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["opt", "cmd"], key: "arrowDown" }}
                onAction={async () => {
                  if (!demo || index === demo.snippets.length - 1) {
                    return;
                  }
                  const updated = moveSnippet(demo.snippets, index, index + 1);
                  await persistDemoChanges(demo.id, demos, { snippets: updated });
                  await load();
                  await onUpdate();
                }}
              />
              <Action
                title="Move to Top"
                icon={Icon.ChevronUp}
                onAction={async () => {
                  if (!demo || index === 0) {
                    return;
                  }
                  const updated = moveSnippet(demo.snippets, index, 0);
                  await persistDemoChanges(demo.id, demos, { snippets: updated });
                  await load();
                  await onUpdate();
                }}
              />
              <Action
                title="Move to Bottom"
                icon={Icon.ChevronDown}
                onAction={async () => {
                  if (!demo || index === demo.snippets.length - 1) {
                    return;
                  }
                  const updated = moveSnippet(demo.snippets, index, demo.snippets.length - 1);
                  await persistDemoChanges(demo.id, demos, { snippets: updated });
                  await load();
                  await onUpdate();
                }}
              />
              <Action.Push
                title="Import Snippets from Lines"
                icon={Icon.Clipboard}
                target={
                  <ImportLinesForm
                    demoId={demo?.id ?? ""}
                    onSave={async () => {
                      await load();
                      await onUpdate();
                    }}
                  />
                }
              />
              <Action
                title={activeDemoId === demo?.id ? "Stop Demo" : "Start Demo"}
                icon={activeDemoId === demo?.id ? Icon.Stop : Icon.Play}
                onAction={async () => {
                  if (!demo) {
                    return;
                  }
                  if (activeDemoId === demo.id) {
                    await clearActiveState();
                    await load();
                    await onUpdate();
                    await showToast({ style: Toast.Style.Success, title: "Demo stopped" });
                    return;
                  }
                  await setActiveState({ demoId: demo.id, index: 0 });
                  await load();
                  await onUpdate();
                  await showToast({ style: Toast.Style.Success, title: "Demo started" });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        title="No snippets yet"
        description="Add a snippet or import multiple lines."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Snippet"
              icon={Icon.Plus}
              target={<SnippetForm mode="create" demoId={demoId} onSave={load} />}
            />
            <Action.Push
              title="Import Snippets from Lines"
              icon={Icon.Clipboard}
              target={<ImportLinesForm demoId={demoId} onSave={load} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function SnippetForm({
  mode,
  demoId,
  snippet,
  onSave,
}: {
  mode: "create" | "edit";
  demoId: string;
  snippet?: Snippet;
  onSave: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [text, setText] = useState(snippet?.text ?? "");

  return (
    <Form
      navigationTitle={mode === "create" ? "Add Snippet" : "Edit Snippet"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "create" ? "Add Snippet" : "Save Changes"}
            onSubmit={async () => {
              if (!text.trim()) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Snippet text is required",
                });
                return;
              }
              const demos = await getDemos();
              const demo = demos.find((item) => item.id === demoId);
              if (!demo) {
                await showToast({ style: Toast.Style.Failure, title: "Demo not found" });
                return;
              }
              const now = Date.now();
              let updatedSnippets: Snippet[];
              if (mode === "create") {
                const newSnippet: Snippet = {
                  id: randomUUID(),
                  text,
                  createdAt: now,
                  updatedAt: now,
                };
                updatedSnippets = [...demo.snippets, newSnippet];
              } else {
                updatedSnippets = demo.snippets.map((item) =>
                  item.id === snippet?.id ? { ...item, text, updatedAt: now } : item,
                );
              }
              await persistDemoChanges(demo.id, demos, { snippets: updatedSnippets });
              await onSave();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Snippet Text"
        placeholder="console.log('hello world')"
        value={text}
        onChange={setText}
        autoFocus
      />
    </Form>
  );
}

function ImportLinesForm({ demoId, onSave }: { demoId: string; onSave: () => Promise<void> }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState("");

  return (
    <Form
      navigationTitle="Import Snippets from Lines"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import"
            onSubmit={async () => {
              const lines = splitSnippetLines(value);
              if (lines.length === 0) {
                await showToast({ style: Toast.Style.Failure, title: "No lines to import" });
                return;
              }
              const demos = await getDemos();
              const demo = demos.find((item) => item.id === demoId);
              if (!demo) {
                await showToast({ style: Toast.Style.Failure, title: "Demo not found" });
                return;
              }
              const now = Date.now();
              const newSnippets = lines.map((line) => ({
                id: randomUUID(),
                text: line,
                createdAt: now,
                updatedAt: now,
              }));
              const updatedSnippets = [...demo.snippets, ...newSnippets];
              await persistDemoChanges(demo.id, demos, { snippets: updatedSnippets });
              await onSave();
              pop();
              await showToast({
                style: Toast.Style.Success,
                title: `Imported ${newSnippets.length} snippet${newSnippets.length === 1 ? "" : "s"}`,
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="lines"
        title="Lines"
        placeholder="Enter one snippet per line to import multiple snippets"
        value={value}
        onChange={setValue}
        autoFocus
      />
    </Form>
  );
}

async function persistDemoChanges(
  demoId: string,
  demos: Demo[],
  updates: Partial<Pick<Demo, "name" | "snippets" | "pinned">>,
) {
  const now = Date.now();
  const updated = demos.map((demo) =>
    demo.id === demoId
      ? {
          ...demo,
          ...updates,
          updatedAt: now,
        }
      : demo,
  );
  await saveDemos(updated);
}

function orderDemos(demos: Demo[]): Demo[] {
  const pinned: Demo[] = [];
  const unpinned: Demo[] = [];
  for (const demo of demos) {
    if (demo.pinned) {
      pinned.push(demo);
    } else {
      unpinned.push(demo);
    }
  }
  return [...pinned, ...unpinned];
}

function moveDemo(demos: Demo[], fromIndex: number, toIndex: number): Demo[] {
  const updated = [...demos];
  const [item] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, item);
  return updated;
}

function moveSnippet(snippets: Snippet[], fromIndex: number, toIndex: number): Snippet[] {
  const updated = [...snippets];
  const [item] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, item);
  return updated;
}

async function exportDemoToFile(demo: Demo): Promise<string> {
  const payload = {
    version: 1,
    name: demo.name,
    snippets: demo.snippets.map((snippet) => snippet.text),
  };
  const fileName = `demo-snippet-${sanitizeFileName(demo.name)}-${Date.now()}.json`;
  const outputPath = join(homedir(), "Downloads", fileName);
  await writeFile(outputPath, JSON.stringify(payload, null, 2), "utf8");
  return outputPath;
}

function sanitizeFileName(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, "-");
  return normalized.replace(/[^a-z0-9-_]/g, "").slice(0, 40) || "demo";
}
