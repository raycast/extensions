import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { ImportForm } from "./components/import-form";
import { SnippetForm, SnippetFromClipboardForm } from "./components/snippet-form";
import { exportItems, readBackup } from "./lib/backup";
import { codeBlock, escapeMarkdown, inlineCode } from "./lib/markdown";
import {
  importSnippets,
  loadSnippets,
  parseBricksElements,
  removeSnippet,
  Snippet,
  SNIPPET_KINDS,
} from "./lib/snippets";

const KIND_ICONS: Record<Snippet["kind"], Icon> = {
  elements: Icon.AppWindowGrid3x3,
  css: Icon.Brush,
  js: Icon.Code,
  html: Icon.CodeBlock,
  text: Icon.Text,
};

const FENCE: Record<Snippet["kind"], string> = { elements: "json", css: "css", js: "js", html: "html", text: "" };

function snippetMarkdown(snippet: Snippet): string {
  const elements = snippet.kind === "elements" ? parseBricksElements(snippet.content) : undefined;
  if (elements) {
    const byParent = new Map<string, typeof elements.content>();
    for (const el of elements.content) {
      const key = String(el.parent);
      byParent.set(key, [...(byParent.get(key) ?? []), el]);
    }
    const ids = new Set(elements.content.map((el) => String(el.id)));
    const lines: string[] = [];
    const walk = (parent: string, depth: number) => {
      for (const el of byParent.get(parent) ?? []) {
        lines.push(
          `${"  ".repeat(depth)}- ${el.label ? `**${escapeMarkdown(String(el.label))}** (${escapeMarkdown(String(el.name))})` : escapeMarkdown(String(el.name))}`,
        );
        walk(String(el.id), depth + 1);
      }
    };
    for (const root of elements.content.filter((el) => !ids.has(String(el.parent)))) {
      lines.push(
        `- ${root.label ? `**${escapeMarkdown(String(root.label))}** (${escapeMarkdown(String(root.name))})` : escapeMarkdown(String(root.name))}`,
      );
      walk(String(root.id), 1);
    }
    const source = elements.sourceUrl ? `\n\nCopied from ${inlineCode(elements.sourceUrl)}` : "";
    return `## ${escapeMarkdown(snippet.name)}\n\n${lines.join("\n")}${source}`;
  }
  return `## ${escapeMarkdown(snippet.name)}\n\n${codeBlock(snippet.content, FENCE[snippet.kind])}`;
}

export default function Command() {
  // usePromise, not useCachedPromise: snippets can hold API keys, and Raycast's cache is stored
  // unencrypted on disk.
  const { data: snippets = [], isLoading, revalidate } = usePromise(loadSnippets);
  const [kind, setKind] = useCachedState<string>("snippets:kind", "all");
  const visible = snippets.filter((s) => kind === "all" || s.kind === kind);

  const newSnippet = (
    <Action.Push
      title="New Snippet"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<SnippetForm onSaved={revalidate} />}
    />
  );
  const fromClipboard = (
    <Action.Push
      title="New Snippet from Clipboard"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
      target={<SnippetFromClipboardForm onSaved={revalidate} />}
    />
  );

  const backup = (
    <ActionPanel.Section>
      {snippets.length > 0 && (
        <Action
          title="Export Snippets"
          icon={Icon.Upload}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={() => exportItems("bricks-snippets", "bricks-snippets", snippets)}
        />
      )}
      <Action.Push
        title="Import Snippets"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        target={
          <ImportForm
            title="Import Snippets"
            description="Choose a bricks-snippets JSON file made with Export Snippets. Snippets with the same id are replaced; the rest are added."
            onImport={async (path) => {
              const { added, updated } = await importSnippets(await readBackup<Snippet>(path, "bricks-snippets"));
              revalidate();
              return `Imported ${added} new, updated ${updated}`;
            }}
          />
        }
      />
    </ActionPanel.Section>
  );

  async function remove(snippet: Snippet) {
    if (
      await confirmAlert({
        title: `Delete ${snippet.name}?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await removeSnippet(snippet.id);
      revalidate();
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={visible.length > 0}
      searchBarPlaceholder="Search snippets…"
      searchBarAccessory={
        <List.Dropdown tooltip="Kind" value={kind} onChange={setKind}>
          <List.Dropdown.Item title="All Kinds" value="all" />
          {SNIPPET_KINDS.map((k) => (
            <List.Dropdown.Item key={k.value} title={k.title} value={k.value} icon={KIND_ICONS[k.value]} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.CodeBlock}
        title="No snippets yet"
        description="Copy elements in Bricks with ⌘C, then run Save Clipboard as Bricks Snippet. Or press ↵ to write one."
        actions={
          <ActionPanel>
            {newSnippet}
            {fromClipboard}
            {backup}
          </ActionPanel>
        }
      />
      {visible.map((snippet) => (
        <List.Item
          key={snippet.id}
          icon={KIND_ICONS[snippet.kind]}
          title={snippet.name}
          keywords={[snippet.kind, ...(snippet.tags ?? [])]}
          detail={<List.Item.Detail markdown={snippetMarkdown(snippet)} />}
          actions={
            <ActionPanel>
              <Action.Paste
                title={snippet.kind === "elements" ? "Paste into Bricks" : "Paste"}
                content={snippet.content}
              />
              <Action.CopyToClipboard content={snippet.content} />
              <Action.Push
                title="Edit Snippet"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<SnippetForm snippet={snippet} onSaved={revalidate} />}
              />
              <Action.Push
                title="Duplicate Snippet"
                icon={Icon.Duplicate}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
                target={<SnippetForm defaults={{ ...snippet, name: `${snippet.name} copy` }} onSaved={revalidate} />}
              />
              {newSnippet}
              {fromClipboard}
              <Action
                title="Delete Snippet"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => remove(snippet)}
              />
              {backup}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
