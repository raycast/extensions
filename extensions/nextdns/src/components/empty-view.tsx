import { Action, ActionPanel, Icon, Image, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import AddDomain from "./add-domain";
import { Mutate } from "../types";

export function EmptyView(props: {
  title: string;
  description: string;
  icon: Icon | Image.ImageLike;
  type?: string;
  mutate?: Mutate;
}) {
  const { title, description, icon, mutate, type } = props;

  return (
    <List.EmptyView
      title={title}
      description={description}
      icon={icon}
      actions={
        <ActionPanel>
          {mutate && (
            <Action.Push
              icon={Icon.Plus}
              title="Add New Domain"
              shortcut={Keyboard.Shortcut.Common.New}
              target={<AddDomain type={type ?? ""} mutate={mutate} />}
            />
          )}
          <ActionPanel.Section>
            <Action
              title="Open Extension Preferences"
              onAction={openExtensionPreferences}
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
