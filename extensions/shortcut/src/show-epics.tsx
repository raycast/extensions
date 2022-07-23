import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import EpicStories from "./components/EpicStories";
import { getOwnersAccessoryItems } from "./helpers/storyHelpers";
import { useEpics, useMemberMap } from "./hooks";

const getProgressIcon = (progress: number) => {
  if (progress === 1) {
    return Icon.CircleProgress100;
  } else if (progress >= 0.667) {
    return Icon.CircleProgress75;
  } else if (progress >= 0.333) {
    return Icon.CircleProgress50;
  } else if (progress > 0) {
    return Icon.CircleProgress25;
  } else {
    return Icon.Circle;
  }
};

export default function ShowEpics() {
  const { data: epics, isValidating } = useEpics();
  const memberMap = useMemberMap();

  return (
    <List isLoading={isValidating}>
      {epics
        ?.sort((a, b) => a.position - b.position)
        .map((epic) => {
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
                        icon: Icon.Circle,
                        tooltip: "No progress",
                      }
                    : {
                        icon: {
                          source: getProgressIcon(progress),
                          tintColor: progress > 0 ? Color.Green : Color.Yellow,
                        },
                        tooltip: progress === 0 ? "Not started" : `${Math.round(progress * 100)}%`,
                      },
                ].filter(Boolean) as List.Item.Accessory[]
              }
            />
          );
        })}
    </List>
  );
}
