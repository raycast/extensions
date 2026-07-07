// Every unchecked todo across all days, oldest first — the same set Hejour's
// ⌘P "!" filter and carried-over card show. Enter opens the todo's day.

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { HEJOUR_WEBSITE, dayDeepLink, dayLabel, loadIndex } from "./lib/hejour";

interface TodoRow {
  id: string;
  text: string;
  day: number;
}

/** null means "no index found" — Hejour isn't installed or has no data yet. */
async function collectTodos(): Promise<TodoRow[] | null> {
  const index = loadIndex();
  if (!index) return null;

  const rows: TodoRow[] = [];
  for (const note of index.notes) {
    note.todos.forEach((todo, i) => {
      rows.push({ id: `${note.id}-${i}`, text: todo.text, day: note.day });
    });
  }
  for (const link of index.links) {
    link.todos.forEach((todo, i) => {
      rows.push({ id: `${link.id}-${i}`, text: todo.text, day: link.to });
    });
  }
  return rows.sort((a, b) => a.day - b.day);
}

export default function OpenTodos() {
  const { data, isLoading } = useCachedPromise(collectTodos, []);
  const todos = data ?? [];

  const sections: { day: number; rows: TodoRow[] }[] = [];
  for (const row of todos) {
    const last = sections[sections.length - 1];
    if (last && last.day === row.day) last.rows.push(row);
    else sections.push({ day: row.day, rows: [row] });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter open todos…">
      {data === null ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Hejour todos found"
          description="Install Hejour and add a todo with [] — it shows up here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Hejour" url={HEJOUR_WEBSITE} />
            </ActionPanel>
          }
        />
      ) : todos.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="All clear"
          description="No open todos — nice."
        />
      ) : (
        sections.map((section) => (
          <List.Section key={section.day} title={dayLabel(section.day)}>
            {section.rows.map((row) => (
              <List.Item
                key={row.id}
                icon={Icon.Circle}
                title={row.text}
                actions={
                  <ActionPanel>
                    <Action.Open
                      title="Open Day in Hejour"
                      target={dayDeepLink(row.day)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Todo"
                      content={row.text}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
