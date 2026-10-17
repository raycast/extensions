import { ActionPanel, Action, List, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { API, MetaForgeUrl, Quest, QuestItem, fetchAllPages, resolveItemRef } from "./api";
import { formatNumber, itemTable, section } from "./format";
import { ViewItemsSubmenu } from "./item-detail";
import { getMapName } from "./maps";
import { GuideActions, RefreshAction, loadFailure } from "./ui";

const UNASSIGNED = "Other";

function questItemRef(entry: QuestItem) {
  return resolveItemRef(entry.item, entry.item_id);
}

function questItemTable(items: QuestItem[]): string {
  return itemTable(items.map((entry) => ({ item: questItemRef(entry), quantity: entry.quantity })));
}

/** Items that exist in MetaForge's database, for the "View Item" submenu. */
function questItems(quest: Quest) {
  return [...quest.rewards, ...quest.required_items, ...quest.granted_items]
    .map((entry) => entry.item)
    .filter((item): item is NonNullable<typeof item> => !!item?.id);
}

function QuestActions({ quest }: { quest: Quest }) {
  return (
    <>
      <Action.OpenInBrowser url={MetaForgeUrl.quest(quest.id)} />
      <GuideActions links={quest.guide_links} url={quest.guide_url} />
      <ViewItemsSubmenu items={questItems(quest)} />
      <Action.CopyToClipboard title="Copy Quest Name" content={quest.name} />
    </>
  );
}

function QuestDetail({ quest }: { quest: Quest }) {
  const maps = [...new Set(quest.locations.map((location) => getMapName(location.map)))];

  const markdown = [
    `# ${quest.name}`,
    quest.image ? `![${quest.name}](${quest.image})` : "",
    section("Objectives", quest.objectives.map((objective) => `- ${objective}`).join("\n")),
    section("Required Items", questItemTable(quest.required_items)),
    section("Provided Items", questItemTable(quest.granted_items)),
    section("Rewards", questItemTable(quest.rewards)),
    section("Locations", maps.map((map) => `- ${map}`).join("\n")),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      navigationTitle={quest.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {quest.trader_name && <Detail.Metadata.Label title="Trader" text={quest.trader_name} icon={Icon.Person} />}
          <Detail.Metadata.Label title="Objectives" text={String(quest.objectives.length)} />
          {quest.xp > 0 && <Detail.Metadata.Label title="XP" text={formatNumber(quest.xp)} icon={Icon.Star} />}
          <Detail.Metadata.Label title="Rewards" text={`${quest.rewards.length} item(s)`} icon={Icon.Gift} />
          {quest.required_items.length > 0 && (
            <Detail.Metadata.Label title="Required Items" text={`${quest.required_items.length} item(s)`} />
          )}
          {maps.length > 0 && (
            <Detail.Metadata.TagList title="Maps">
              {maps.map((map) => (
                <Detail.Metadata.TagList.Item key={map} text={map} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="MetaForge" target={MetaForgeUrl.quest(quest.id)} text="View on MetaForge" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <QuestActions quest={quest} />
        </ActionPanel>
      }
    />
  );
}

function matches(quest: Quest, search: string): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  return (
    quest.name.toLowerCase().includes(needle) ||
    quest.objectives.some((objective) => objective.toLowerCase().includes(needle)) ||
    [...quest.rewards, ...quest.required_items].some((entry) => questItemRef(entry).name.toLowerCase().includes(needle))
  );
}

export default function SearchQuests() {
  const [searchText, setSearchText] = useState("");
  const [trader, setTrader] = useState("all");

  const { isLoading, data, revalidate } = useCachedPromise(fetchAllPages<Quest>, [API.quests], {
    initialData: [],
    keepPreviousData: true,
    failureToastOptions: loadFailure("quests"),
  });

  const traders = useMemo(
    () => [...new Set(data.map((quest) => quest.trader_name ?? UNASSIGNED))].sort((a, b) => a.localeCompare(b)),
    [data],
  );

  const sections = useMemo(() => {
    const filtered = data.filter(
      (quest) => (trader === "all" || (quest.trader_name ?? UNASSIGNED) === trader) && matches(quest, searchText),
    );
    return traders
      .map((name) => ({ name, quests: filtered.filter((quest) => (quest.trader_name ?? UNASSIGNED) === name) }))
      .filter((group) => group.quests.length > 0);
  }, [data, traders, trader, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search quests, objectives or rewards..."
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Trader" value={trader} onChange={setTrader}>
          <List.Dropdown.Item title="All Traders" value="all" />
          <List.Dropdown.Section title="Traders">
            {traders.map((name) => (
              <List.Dropdown.Item key={name} title={name} value={name} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {sections.map((group) => (
        <List.Section key={group.name} title={group.name} subtitle={`${group.quests.length}`}>
          {group.quests.map((quest) => (
            <List.Item
              key={quest.id}
              icon={quest.image ? { source: quest.image, fallback: Icon.CheckCircle } : Icon.CheckCircle}
              title={quest.name}
              subtitle={`${quest.objectives.length} objective(s)`}
              accessories={[
                ...(quest.required_items.length > 0
                  ? [{ icon: Icon.Box, text: `${quest.required_items.length}`, tooltip: "Required items" }]
                  : []),
                { icon: Icon.Gift, text: `${quest.rewards.length}`, tooltip: "Rewards" },
                ...(quest.xp > 0 ? [{ icon: Icon.Star, text: `${formatNumber(quest.xp)} XP` }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Details" icon={Icon.Eye} target={<QuestDetail quest={quest} />} />
                  <QuestActions quest={quest} />
                  <RefreshAction onRefresh={revalidate} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
