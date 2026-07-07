// Search every line of every day (notes + linked sections) and jump to the
// day in Hejour. Read-only: data comes from the app's index.json.

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { HEJOUR_WEBSITE, dayDeepLink, dayLabel, loadIndex } from "./lib/hejour";

interface Row {
  id: string;
  line: string;
  day: number;
}

function collectRows(): Row[] | undefined {
  const index = loadIndex();
  if (!index) return undefined;

  // Lines are stored as typed — drop markdown markers and divider-only lines.
  const clean = (raw: string) =>
    raw
      .replace(/^#{1,4}\s+/, "")
      .replace(/^>\s+/, "")
      .trim();
  const isDivider = (text: string) => /^-{3,}$/.test(text);

  const rows: Row[] = [];
  for (const note of index.notes) {
    note.lines.forEach((line, i) => {
      const text = clean(line);
      if (text && !isDivider(text))
        rows.push({ id: `${note.id}-${i}`, line: text, day: note.day });
    });
  }
  for (const link of index.links) {
    // A linked section is visible on both days; jump to the day it's for.
    link.lines.forEach((line, i) => {
      const text = clean(line);
      if (text && !isDivider(text))
        rows.push({ id: `${link.id}-${i}`, line: text, day: link.to });
    });
  }
  return rows.sort((a, b) => b.day - a.day);
}

export default function SearchNotes() {
  const rows = collectRows();

  if (!rows) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Hejour notes found"
          description="Install Hejour and write your first day — search lights up automatically."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Hejour" url={HEJOUR_WEBSITE} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Group consecutive rows of the same day into sections.
  const sections: { day: number; rows: Row[] }[] = [];
  for (const row of rows) {
    const last = sections[sections.length - 1];
    if (last && last.day === row.day) last.rows.push(row);
    else sections.push({ day: row.day, rows: [row] });
  }

  return (
    <List searchBarPlaceholder="Search every line of every day…">
      {sections.map((section) => (
        <List.Section key={section.day} title={dayLabel(section.day)}>
          {section.rows.map((row) => (
            <List.Item
              key={row.id}
              icon={Icon.Paragraph}
              title={row.line}
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Open Day in Hejour"
                    target={dayDeepLink(row.day)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Line"
                    content={row.line}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
