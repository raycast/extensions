import { Action, ActionPanel, Keyboard, List } from "@raycast/api";
import { TEMPLATES, TEMPLATE_GROUPS } from "./data/templates";
import { fence } from "./lib/markdown";

export default function Command() {
  return (
    <List isShowingDetail searchBarPlaceholder="Search templates…">
      {TEMPLATE_GROUPS.map((group) => (
        <List.Section key={group} title={group}>
          {TEMPLATES.filter((t) => t.group === group).map((t) => (
            <List.Item
              key={t.title}
              title={t.title}
              keywords={[group, ...t.useFor.split(/\W+/)]}
              detail={
                <List.Item.Detail
                  markdown={[
                    t.useFor,
                    fence(t.text, t.lang),
                    t.composeHint ? `_From your own text: Compose Diagram → ${t.composeHint}_` : "",
                  ]
                    .filter(Boolean)
                    .join("\n\n")}
                />
              }
              actions={
                <ActionPanel>
                  <Action.Paste title="Paste" content={t.text} />
                  <Action.CopyToClipboard title="Copy" content={t.text} />
                  <Action.CopyToClipboard
                    title="Copy as Code Block"
                    content={fence(t.text, t.lang)}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.Paste
                    title="Paste as Code Block"
                    content={fence(t.text, t.lang)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
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
