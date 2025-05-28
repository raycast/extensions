import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { format } from "date-fns";
import removeMarkdown from "remove-markdown";

import { ProjectResult } from "../api/getProjects";
import { getUserIcon } from "../helpers/users";
import useProjectUpdates from "../hooks/useProjectUpdates";

import OpenInLinear from "./OpenInLinear";

type ProjectUpdatesProps = {
  project: ProjectResult;
};

const healthType = {
  onTrack: { color: Color.Green, title: "On Track" },
  atRisk: { color: Color.Orange, title: "At Risk" },
  offTrack: { color: Color.Red, title: "Off Track" },
};

export default function ProjectUpdates({ project }: ProjectUpdatesProps) {
  const { updates, isLoadingUpdates, mutateUpdates } = useProjectUpdates(project.id);

  return (
    <List
      isLoading={isLoadingUpdates}
      navigationTitle={`${project.name} — Project Updates`}
      searchBarPlaceholder="Filter by user"
      isShowingDetail
    >
      <List.EmptyView title="No updates" description="This project doesn't have any updates." />
      {updates?.map((update) => {
        const createdAt = new Date(update.createdAt);

        const { color, title } = healthType[update.health];
        return (
          <List.Item
            key={update.id}
            title={update.user.displayName}
            icon={getUserIcon(update.user)}
            keywords={removeMarkdown(update.body).replace(/\n/g, " ").split(" ")}
            accessories={[
              { date: createdAt, tooltip: `Created: ${format(createdAt, "EEEE d MMMM yyyy 'at' HH:mm")}` },
              { icon: Icon.Heartbeat, tag: { color, value: title } },
            ]}
            detail={<List.Item.Detail markdown={update.body} />}
            actions={
              <ActionPanel>
                <OpenInLinear title="Open Update" url={update.url} />

                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    content={update.url}
                    title="Copy Update URL"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  />

                  <Action.CopyToClipboard
                    icon={Icon.Clipboard}
                    content={update.body}
                    title="Copy Update"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "'" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={mutateUpdates}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
