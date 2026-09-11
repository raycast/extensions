import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { FC } from "react";
import type { FileNode } from "../types";

export const RestrictedSection: FC<{ items: FileNode[] }> = ({ items }) => {
  return (
    <List.Section title="Restricted Access">
      {items.map((node) => (
        <List.Item
          key={node.path}
          title={node.name}
          subtitle={node.path}
          icon={{ source: Icon.Lock, tintColor: Color.Red }}
          accessories={[{ text: "Permission Denied" }]}
          actions={
            <ActionPanel>
              <Action.Open
                title="Grant Full Disk Access"
                icon={Icon.Shield}
                target="x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
              />
              <Action.ShowInFinder path={node.path} />
              <Action.CopyToClipboard
                title="Copy Path"
                content={node.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
};
