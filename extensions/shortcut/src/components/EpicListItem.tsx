import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { Epic, EpicSlim } from "@useshortcut/client";
import { getOwnersAccessoryItems } from "../helpers/storyHelpers";
import { useMemberMap } from "../hooks";
import EpicStories from "./EpicStories";

export default function EpicListItem({ epic }: { epic: EpicSlim | Epic }) {
  const memberMap = useMemberMap();

  const owners = epic.owner_ids.map((ownerId) => memberMap?.[ownerId]);
  const progress = epic.stats.num_stories_done / epic.stats.num_stories_total;

  return (
    <List.Item
      title={epic.name}
      subtitle={`#${epic.id}`}
      key={epic.id}
      icon={Icon.Tag}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.List} title="View Epic Stories" target={<EpicStories epicId={epic.id} />} />
          <Action.OpenInBrowser url={epic.app_url} />
        </ActionPanel>
      }
      accessories={
        [
          {
            date: new Date(epic.created_at!),
          },
          ...getOwnersAccessoryItems(owners),

          isNaN(progress)
            ? {
                icon: getProgressIcon(progress, "#58b1e4"),
                tooltip: "No progress",
              }
            : {
                icon: getProgressIcon(progress, "#58b1e4"),
                tooltip: progress === 0 ? "Not started" : `${Math.round(progress * 100)}%`,
              },
        ].filter(Boolean) as List.Item.Accessory[]
      }
    />
  );
}
