import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";

import { formatAge } from "../lib/format";
import type { ExcludedItem } from "../types";
import { fileLink, providerIcon } from "./CandidateDetail";

function KeptItemDetail({ item }: { item: ExcludedItem }) {
  const addedAt = new Date(item.addedAt);
  const keptSince = Number.isNaN(addedAt.getTime())
    ? "Unknown"
    : `${addedAt.toLocaleDateString()} · ${formatAge(addedAt)}`;
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Details" text={item.subtitle} />
          <List.Item.Detail.Metadata.TagList title="Source">
            <List.Item.Detail.Metadata.TagList.Item
              text={item.providerId}
              icon={providerIcon(item.providerId, Icon.Box)}
              color={Color.Green}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Kept Since" text={keptSince} />
          {item.path ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="Location" text="Show in Finder" target={fileLink(item.path)} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function ExcludedItems({
  initialItems,
  onAllow,
}: {
  initialItems: ExcludedItem[];
  onAllow: (id: string) => Promise<boolean>;
}) {
  const [items, setItems] = useState(initialItems);

  async function allow(id: string) {
    if (await onAllow(id)) setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <List isShowingDetail navigationTitle="Kept Items" searchBarPlaceholder="Search kept items">
      <List.EmptyView
        icon={Icon.Shield}
        title="No Kept Items"
        description="Use Keep Item on a cleanup candidate to exclude it from future cleanup."
      />
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          icon={providerIcon(item.providerId, { source: Icon.Shield, tintColor: Color.Green })}
          accessories={[{ icon: Icon.Lock, tooltip: "Kept out of cleanup" }]}
          keywords={[item.id, item.providerId, item.subtitle]}
          detail={<KeptItemDetail item={item} />}
          actions={
            <ActionPanel>
              <Action title="Allow Cleanup Again" icon={Icon.Undo} onAction={() => allow(item.id)} />
              {item.path ? <Action.ShowInFinder path={item.path} /> : null}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
