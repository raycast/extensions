import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import type { FC } from "react";
import type { FileNode } from "../types";

export async function openDiskAccessPrefs(): Promise<void> {
  try {
    await open(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
    );
  } catch {
    console.error("Failed to open preferences");
  }
}

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
              <Action
                title="Grant Full Disk Access"
                icon={Icon.Shield}
                onAction={openDiskAccessPrefs}
              />
              <Action.ShowInFinder path={node.path} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
};
