import { ActionPanel, Action, List, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo, useEffect, useRef } from "react";
import { API, Quest, PaginatedResponse } from "./api";
import { getCached, setCache, CacheKeys } from "./cache";

function QuestDetail({ quest }: { quest: Quest }) {
  const objectivesList = quest.objectives.map((obj) => `- ${obj}`).join("\n");

  const rewardsList = quest.rewards
    .map((reward) => `| ![](${reward.item.icon}) | ${reward.item.name} | ${reward.quantity} | ${reward.item.rarity} |`)
    .join("\n");

  const markdown = `
# ${quest.name}

## Objectives

${objectivesList}

${quest.xp > 0 ? `**XP Reward:** ${quest.xp}` : ""}

---

${
  quest.rewards.length > 0
    ? `
## Rewards

| Icon | Item | Quantity | Rarity |
|------|------|----------|--------|
${rewardsList}
`
    : ""
}

${
  quest.required_items.length > 0
    ? `
## Required Items

${quest.required_items.map((item) => `- ${item}`).join("\n")}
`
    : ""
}

${
  quest.locations.length > 0
    ? `
## Locations

${quest.locations.map((loc) => `- ${loc.map}`).join("\n")}
`
    : ""
}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Objectives" text={`${quest.objectives.length} objective(s)`} />
          {quest.xp > 0 && <Detail.Metadata.Label title="XP" text={String(quest.xp)} />}
          <Detail.Metadata.Label title="Rewards" text={`${quest.rewards.length} item(s)`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="MetaForge"
            target={`https://metaforge.app/arc-raiders/quests/${quest.id}`}
            text="View on MetaForge"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://metaforge.app/arc-raiders/quests/${quest.id}`} />
          <Action.CopyToClipboard title="Copy Quest Name" content={quest.name} />
        </ActionPanel>
      }
    />
  );
}

export default function SearchQuests() {
  const [searchText, setSearchText] = useState("");

  const cachedPages = useRef<Map<number, Quest[]>>(new Map());

  // Load cached pages on mount
  useEffect(() => {
    for (let i = 1; i <= 10; i++) {
      const cached = getCached<Quest[]>(CacheKeys.quests(i));
      if (cached) cachedPages.current.set(i, cached);
    }
  }, []);

  const { isLoading, data, pagination } = useFetch((options) => `${API.quests}?page=${options.page + 1}`, {
    mapResult(result: PaginatedResponse<Quest>) {
      const page = result.pagination.page;
      // Cache each page
      setCache(CacheKeys.quests(page), result.data);
      cachedPages.current.set(page, result.data);
      return {
        data: result.data,
        hasMore: result.pagination.hasNextPage,
      };
    },
    keepPreviousData: true,
    initialData: [],
    onError() {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load quests",
        message: "Server temporarily unavailable. Please try again.",
      });
    },
  });

  const quests = data || [];

  const filteredQuests = useMemo(() => {
    return quests.filter((quest) => {
      if (searchText === "") return true;
      const search = searchText.toLowerCase();
      return (
        quest.name.toLowerCase().includes(search) ||
        quest.objectives.some((obj) => obj.toLowerCase().includes(search)) ||
        quest.rewards.some((reward) => reward.item.name.toLowerCase().includes(search))
      );
    });
  }, [quests, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search quests..."
      filtering={false}
      onSearchTextChange={setSearchText}
      pagination={pagination}
    >
      {filteredQuests.map((quest) => (
        <List.Item
          key={quest.id}
          icon={Icon.CheckCircle}
          title={quest.name}
          subtitle={`${quest.objectives.length} objective(s)`}
          accessories={[
            {
              icon: Icon.Gift,
              text: `${quest.rewards.length} rewards`,
            },
            ...(quest.xp > 0 ? [{ icon: Icon.Star, text: `${quest.xp} XP` }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<QuestDetail quest={quest} />} />
              <Action.OpenInBrowser url={`https://metaforge.app/arc-raiders/quests/${quest.id}`} />
              <Action.CopyToClipboard title="Copy Quest Name" content={quest.name} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
