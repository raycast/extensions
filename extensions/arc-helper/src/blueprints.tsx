import { ActionPanel, Action, List, Detail, Icon, Color, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { API, Item, MetaForgeUrl, fetchAllPages } from "./api";
import { ItemDetail } from "./item-detail";
import { BlueprintTracker, useBlueprintStore } from "./storage";
import { RefreshAction, itemIcon, loadFailure, rarityAccessory } from "./ui";

type FilterMode = "all" | "needed" | "obtained";

interface BlueprintProps {
  item: Item;
  blueprints: BlueprintTracker;
}

function ToggleObtainedAction({ item, blueprints }: BlueprintProps) {
  const isObtained = blueprints.isObtained(item.id);
  return (
    <Action
      title={isObtained ? "Mark as Needed" : "Mark as Obtained"}
      icon={isObtained ? Icon.Circle : Icon.CheckCircle}
      shortcut={Keyboard.Shortcut.Common.Open}
      onAction={() => blueprints.toggleObtained(item.id, item.name)}
    />
  );
}

function DuplicateActions({ item, blueprints }: BlueprintProps) {
  const duplicates = blueprints.status(item.id)?.duplicates ?? 0;
  return (
    <ActionPanel.Section title="Duplicates">
      <Action
        title="Add Duplicate"
        icon={Icon.PlusCircle}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
        onAction={() => blueprints.adjustDuplicates(item.id, item.name, 1)}
      />
      {duplicates > 0 && (
        <Action
          title="Remove Duplicate"
          icon={Icon.MinusCircle}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "d" },
            Windows: { modifiers: ["ctrl", "shift"], key: "d" },
          }}
          onAction={() => blueprints.adjustDuplicates(item.id, item.name, -1)}
        />
      )}
    </ActionPanel.Section>
  );
}

function BlueprintDetail({ item }: { item: Item }) {
  const blueprints = useBlueprintStore();
  const status = blueprints.status(item.id);

  return (
    <ItemDetail
      id={item.id}
      preview={item}
      extraMarkdown={[
        "## Collection Status",
        "",
        "| Status | Value |",
        "|---|---|",
        `| **Obtained** | ${status?.obtained ? "Yes" : "No"} |`,
        `| **Duplicates** | ${status?.duplicates ?? 0} |`,
      ].join("\n")}
      extraMetadata={
        <>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={status?.obtained ? "Obtained" : "Needed"}
              color={status?.obtained ? Color.Green : Color.Orange}
            />
          </Detail.Metadata.TagList>
          {(status?.duplicates ?? 0) > 0 && (
            <Detail.Metadata.Label title="Duplicates" text={String(status?.duplicates)} />
          )}
          <Detail.Metadata.Separator />
        </>
      }
      extraActions={
        <>
          <ActionPanel.Section>
            <ToggleObtainedAction item={item} blueprints={blueprints} />
          </ActionPanel.Section>
          <DuplicateActions item={item} blueprints={blueprints} />
        </>
      }
    />
  );
}

export default function Blueprints() {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const blueprints = useBlueprintStore();

  const { isLoading, data, revalidate } = useCachedPromise(
    fetchAllPages<Item>,
    [API.items, { item_type: "Blueprint" }],
    {
      initialData: [],
      keepPreviousData: true,
      failureToastOptions: loadFailure("blueprints"),
    },
  );

  const obtainedCount = data.filter((item) => blueprints.isObtained(item.id)).length;
  const progressText = data.length > 0 ? ` (${obtainedCount}/${data.length})` : "";

  const visible = data.filter((item) => {
    if (filterMode === "obtained") return blueprints.isObtained(item.id);
    if (filterMode === "needed") return !blueprints.isObtained(item.id);
    return true;
  });

  return (
    <List
      isLoading={isLoading || blueprints.isLoading}
      searchBarPlaceholder="Search blueprints..."
      navigationTitle={`Blueprints${progressText}`}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filterMode} onChange={(value) => setFilterMode(value as FilterMode)}>
          <List.Dropdown.Item title="All Blueprints" value="all" />
          <List.Dropdown.Item title="Needed" value="needed" />
          <List.Dropdown.Item title="Obtained" value="obtained" />
        </List.Dropdown>
      }
    >
      {visible.map((item) => {
        const isObtained = blueprints.isObtained(item.id);
        const duplicates = blueprints.status(item.id)?.duplicates ?? 0;

        return (
          <List.Item
            key={item.id}
            icon={itemIcon(item.icon, Icon.Document)}
            title={item.name}
            subtitle={duplicates > 0 ? `+${duplicates} duplicates` : undefined}
            keywords={[item.rarity ?? "", ...(item.loot_area?.split(/,\s*/) ?? [])].filter(Boolean)}
            accessories={[
              {
                icon: isObtained
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText },
                tooltip: isObtained ? "Obtained" : "Needed",
              },
              ...rarityAccessory(item.rarity),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <ToggleObtainedAction item={item} blueprints={blueprints} />
                  <Action.Push title="View Details" icon={Icon.Eye} target={<BlueprintDetail item={item} />} />
                </ActionPanel.Section>
                <DuplicateActions item={item} blueprints={blueprints} />
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={MetaForgeUrl.item(item.id)} />
                  <Action.CopyToClipboard title="Copy Blueprint Name" content={item.name} />
                  <RefreshAction onRefresh={revalidate} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
