import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";
import React from "react";
import { ActionToPexels } from "./action-to-pexels";
import { Collection } from "pexels";
import ViewCollectionMedias from "../view-collection-medias";

export function ActionOnCollection(props: { collection: Collection }) {
  const { collection } = props;
  return (
    <ActionPanel>
      <Action.Push
        icon={Icon.Terminal}
        title={"View Collections"}
        target={<ViewCollectionMedias id={collection.id} title={collection.title} />}
      />
      <ActionToPexels />
      <ActionPanel.Section>
        <Action
          icon={Icon.Gear}
          title="Open Extension Preferences"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
