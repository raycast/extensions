import { Action, ActionPanel, Icon } from "@raycast/api";
import React from "react";
import { ActionToPexels } from "./action-to-pexels";
import { Collection } from "pexels";
import ViewCollectionMedias from "../view-collection-medias";
import { ActionOpenPreferences } from "./action-open-preferences";

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

      <ActionOpenPreferences />
    </ActionPanel>
  );
}
