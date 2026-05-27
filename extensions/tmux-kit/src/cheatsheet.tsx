import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  List,
} from "@raycast/api";
import {
  CHEAT_ENTRIES,
  CheatEntry,
  SECTIONS_IN_ORDER,
} from "./data/cheatsheet";

export default function CheatsheetCommand() {
  const grouped = SECTIONS_IN_ORDER.map((section) => ({
    section,
    items: CHEAT_ENTRIES.filter((e) => e.section === section),
  })).filter((g) => g.items.length > 0);

  return (
    <List
      searchBarPlaceholder="Search prefix / command / keyword…"
      isShowingDetail={false}
    >
      {grouped.map(({ section, items }) => (
        <List.Section key={section} title={section}>
          {items.map((entry) => (
            <EntryItem key={entry.id} entry={entry} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function EntryItem({ entry }: { entry: CheatEntry }) {
  const subtitle = entry.shortcut ?? entry.command ?? entry.shell ?? "";
  const keywords = [
    entry.title,
    entry.shortcut,
    entry.command,
    entry.shell,
    entry.description,
    ...(entry.keywords ?? []),
  ]
    .filter((v): v is string => Boolean(v))
    .flatMap((k) => k.split(/[\s/]+/))
    .filter((s) => s.length > 0);

  const accessories = entry.description
    ? [{ text: entry.description }]
    : undefined;

  return (
    <List.Item
      title={entry.title}
      subtitle={subtitle}
      accessories={accessories}
      keywords={keywords}
      icon={iconFor(entry)}
      actions={<EntryActions entry={entry} />}
    />
  );
}

function iconFor(entry: CheatEntry): Icon {
  if (entry.shortcut) return Icon.Keyboard;
  if (entry.command) return Icon.Terminal;
  if (entry.shell) return Icon.Code;
  if (entry.section.startsWith("Files")) return Icon.Document;
  if (entry.section.startsWith("Workflow")) return Icon.Bolt;
  return Icon.Bookmark;
}

function EntryActions({ entry }: { entry: CheatEntry }) {
  // The CheatEntry type allows shortcut/command/shell to coexist on a single
  // entry. Only the first present field gets cmd+c so the keyboard shortcut
  // never silently shadows a sibling Copy action.
  const primaryPayload: "shortcut" | "command" | "shell" | null = entry.shortcut
    ? "shortcut"
    : entry.command
      ? "command"
      : entry.shell
        ? "shell"
        : null;
  const primaryShortcut: Keyboard.Shortcut = {
    modifiers: ["cmd"],
    key: "c",
  };

  return (
    <ActionPanel>
      <Action.Push
        title="Show Detail"
        target={<EntryDetail entry={entry} />}
        icon={Icon.Book}
      />
      {entry.shortcut && (
        <Action.CopyToClipboard
          title="Copy Shortcut"
          content={entry.shortcut}
          shortcut={primaryPayload === "shortcut" ? primaryShortcut : undefined}
        />
      )}
      {entry.command && (
        <Action.CopyToClipboard
          title="Copy Command"
          content={entry.command}
          shortcut={primaryPayload === "command" ? primaryShortcut : undefined}
        />
      )}
      {entry.shell && (
        <Action.CopyToClipboard
          title="Copy Shell Command"
          content={entry.shell}
          shortcut={primaryPayload === "shell" ? primaryShortcut : undefined}
        />
      )}
      {entry.description && (
        <Action.CopyToClipboard
          title="Copy Description"
          content={entry.description}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      )}
    </ActionPanel>
  );
}

function EntryDetail({ entry }: { entry: CheatEntry }) {
  const md = buildMarkdown(entry);
  return (
    <Detail
      markdown={md}
      navigationTitle={entry.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Section" text={entry.section} />
          {entry.shortcut && (
            <Detail.Metadata.Label title="Shortcut" text={entry.shortcut} />
          )}
          {entry.command && (
            <Detail.Metadata.Label
              title="Command mode"
              text={`prefix : ${entry.command}`}
            />
          )}
          {entry.shell && (
            <Detail.Metadata.Label title="Shell" text={entry.shell} />
          )}
        </Detail.Metadata>
      }
      actions={<EntryActions entry={entry} />}
    />
  );
}

function buildMarkdown(e: CheatEntry): string {
  const lines: string[] = [`# ${e.title}`, ""];
  if (e.shortcut) lines.push(`**Shortcut:** \`${e.shortcut}\``, "");
  if (e.command)
    lines.push(`**Command mode:** \`prefix :\` → \`${e.command}\``, "");
  if (e.shell) lines.push(`**Shell:** \`${e.shell}\``, "");
  if (e.description) lines.push(e.description);
  if (e.details) lines.push("", "---", "", e.details);
  return lines.join("\n");
}
