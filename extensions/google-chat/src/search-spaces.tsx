import { Action, Icon, Image, List } from "@raycast/api";
import { getAvatarIcon, useFrecencySorting } from "@raycast/utils";
import { useState } from "react";

import type { SpaceItem, SpaceKind } from "./api/types";
import { ChatView } from "./components/ChatView";
import { SpaceActions } from "./components/SpaceActions";
import { useSpaceItems } from "./hooks/useSpaceItems";

type Filter = "all" | SpaceKind;

const SECTIONS: { kind: SpaceKind; title: string }[] = [
  { kind: "dm", title: "Direct Messages" },
  { kind: "space", title: "Spaces" },
  { kind: "group", title: "Group Chats" },
];

function icon(item: SpaceItem): Image.ImageLike {
  if (item.avatarUrl) return { source: item.avatarUrl, mask: Image.Mask.Circle };
  if (item.kind === "dm") return getAvatarIcon(item.title);
  return item.kind === "group" ? Icon.TwoPeople : Icon.SpeechBubble;
}

function lastActive(item: SpaceItem): number {
  return Date.parse(item.space.lastActiveTime ?? "0") || 0;
}

function SearchSpaces() {
  const { items, isLoading, revalidate } = useSpaceItems();
  const [filter, setFilter] = useState<Filter>("all");
  const {
    data: sorted,
    visitItem,
    resetRanking,
  } = useFrecencySorting(items, {
    namespace: "spaces",
    key: (item) => item.space.name,
    sortUnvisited: (a, b) => lastActive(b) - lastActive(a),
  });

  const visible = filter === "all" ? sorted : sorted.filter((item) => item.kind === filter);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search spaces, group chats and people"
      searchBarAccessory={
        <List.Dropdown tooltip="Conversation Type" storeValue onChange={(value) => setFilter(value as Filter)}>
          <List.Dropdown.Item title="All" value="all" />
          {SECTIONS.map((section) => (
            <List.Dropdown.Item key={section.kind} title={section.title} value={section.kind} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView title={isLoading ? "Loading conversations…" : "No conversations"} icon={Icon.SpeechBubble} />
      {SECTIONS.map((section) => {
        const sectionItems = visible.filter((item) => item.kind === section.kind);
        return (
          <List.Section key={section.kind} title={section.title} subtitle={`${sectionItems.length}`}>
            {sectionItems.map((item) => (
              <List.Item
                key={item.space.name}
                title={item.title}
                subtitle={item.kind === "dm" ? item.email : item.space.spaceDetails?.description}
                keywords={item.email ? [item.email] : undefined}
                icon={icon(item)}
                accessories={
                  item.space.lastActiveTime
                    ? [{ date: new Date(item.space.lastActiveTime), tooltip: "Last message" }]
                    : undefined
                }
                actions={
                  <SpaceActions item={item} onVisit={() => visitItem(item)} onChange={revalidate}>
                    <Action
                      title="Reset Ranking"
                      icon={Icon.ArrowCounterClockwise}
                      onAction={() => resetRanking(item)}
                    />
                  </SpaceActions>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

export default function Command() {
  return (
    <ChatView>
      <SearchSpaces />
    </ChatView>
  );
}
