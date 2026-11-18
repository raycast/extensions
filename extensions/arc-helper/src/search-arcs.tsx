import { ActionPanel, Action, List, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { API, Arc, MetaForgeUrl, PaginatedResponse, apiUrl, resolveItemRef } from "./api";
import { itemTable, section } from "./format";
import { ViewItemsSubmenu } from "./item-detail";
import { GuideActions, loadFailure } from "./ui";

function canFly(arc: Arc): boolean {
  return arc.data?.variants?.some((variant) => variant.can_fly) ?? false;
}

function lootItems(arc: Arc) {
  return (arc.loot ?? []).map((entry) => resolveItemRef(entry.item, entry.item_id));
}

/** Loot that exists in MetaForge's database, for the "View Loot Item" submenu. */
function viewableLoot(arc: Arc) {
  return (arc.loot ?? []).flatMap((entry) => (entry.item?.id ? [entry.item] : []));
}

function ArcActions({ arc }: { arc: Arc }) {
  return (
    <>
      <Action.OpenInBrowser url={MetaForgeUrl.arc(arc.id)} />
      <GuideActions url={arc.guide_url} />
      <ViewItemsSubmenu title="View Loot Item" items={viewableLoot(arc)} />
      <Action.CopyToClipboard title="Copy ARC Name" content={arc.name} />
    </>
  );
}

function ArcDetail({ arc }: { arc: Arc }) {
  const image = arc.image || arc.icon;
  const markdown = [
    `# ${arc.name}`,
    image ? `![${arc.name}](${image})` : "",
    arc.description || "No description available.",
    section("Loot", itemTable(lootItems(arc).map((item) => ({ item })))),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      navigationTitle={arc.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={arc.name} />
          <Detail.Metadata.Label title="Movement" text={canFly(arc) ? "Flying" : "Ground"} />
          <Detail.Metadata.Label title="Loot" text={`${arc.loot?.length ?? 0} item(s)`} icon={Icon.Box} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="MetaForge" target={MetaForgeUrl.arc(arc.id)} text="View on MetaForge" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ArcActions arc={arc} />
        </ActionPanel>
      }
    />
  );
}

function matches(arc: Arc, search: string): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  return (
    arc.name.toLowerCase().includes(needle) ||
    !!arc.description?.toLowerCase().includes(needle) ||
    lootItems(arc).some((item) => item.name.toLowerCase().includes(needle))
  );
}

export default function SearchArcs() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch(apiUrl(API.arcs, { includeLoot: "true", limit: 100 }), {
    mapResult: (result: PaginatedResponse<Arc>) => ({ data: result.data }),
    initialData: [],
    keepPreviousData: true,
    failureToastOptions: loadFailure("ARCs"),
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search ARCs by name, description or loot..."
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {data
        .filter((arc) => matches(arc, searchText))
        .map((arc) => (
          <List.Item
            key={arc.id}
            icon={{ source: arc.icon, fallback: Icon.Bug }}
            title={arc.name}
            subtitle={arc.description ? `${arc.description.slice(0, 60).trim()}…` : undefined}
            accessories={[
              ...(canFly(arc) ? [{ icon: Icon.Airplane, tooltip: "Flying" }] : []),
              ...(arc.loot?.length ? [{ icon: Icon.Box, text: `${arc.loot.length}`, tooltip: "Loot drops" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="View Details" icon={Icon.Eye} target={<ArcDetail arc={arc} />} />
                <ArcActions arc={arc} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
