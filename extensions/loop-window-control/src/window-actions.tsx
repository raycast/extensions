import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { ACTIONS, GROUPS } from "./lib/actions";
import { runAction, sendRequest } from "./lib/loop";
import { buildURL } from "./lib/transport";
import Setup from "./setup";

export default function Command() {
  const [busy, setBusy] = useState(false);
  return (
    <List isLoading={busy} searchBarPlaceholder="Search window actions, e.g. Left Half, Center, Next Screen…">
      {GROUPS.map((group) => (
        <List.Section key={group} title={group}>
          {ACTIONS.filter((action) => action.group === group).map((action) => (
            <List.Item
              key={action.id}
              icon={Icon.Window}
              title={action.title}
              keywords={[action.id, action.group]}
              actions={
                <ActionPanel>
                  <Action
                    title="Run with Loop"
                    icon={Icon.Play}
                    onAction={async () => {
                      if (busy) return;
                      setBusy(true);
                      try {
                        await runAction(action.id);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Loop URL"
                    content={buildURL({ kind: "action", value: action.id })}
                  />
                  <Action.Push title="Check Installation" icon={Icon.Gear} target={<Setup />} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      <List.Section title="Help">
        <List.Item
          title="Show Named Keybinds in Loop"
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action
                title="Open Loop Keybind List"
                onAction={() => sendRequest({ kind: "list", value: "keybinds" })}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Check Installation"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action.Push title="Check Installation" target={<Setup />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
