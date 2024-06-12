import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";

import { onApiError, useChannels, useGroups, useUsers } from "./shared/client";
import { UpdatesModal } from "./shared/UpdatesModal";
import { openChannel, openChat } from "./shared/utils";
import { withSlackClient } from "./shared/withSlackClient";
import { useFrecencySorting } from "@raycast/utils";

function Search() {
  return (
    <UpdatesModal>
      <SlackList />
    </UpdatesModal>
  );
}

function SlackList() {
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useUsers();
  const { data: channels, isLoading: isLoadingChannels, error: channelsError } = useChannels();
  const { data: groups, isLoading: isLoadingGroups, error: groupsError } = useGroups();

  if (usersError && channelsError && groupsError) {
    onApiError({ exitExtension: true });
  }

  const {
    data: recents,
    visitItem,
    resetRanking,
  } = useFrecencySorting([...(users ?? []), ...(channels ?? []), ...(groups ?? [])], {
    key: (item) => item.id,
  });

  return (
    <List isLoading={isLoadingUsers || isLoadingChannels || isLoadingGroups}>
      {recents.map((item) => {
        const { id, name, icon, teamId } = item;
        const isUser = id.startsWith("U");

        return (
          <List.Item
            key={id}
            title={name}
            icon={isUser ? (icon ? { source: icon, mask: Image.Mask.Circle } : Icon.Person) : icon}
            actions={
              <ActionPanel>
                <Action
                  icon={{ fileIcon: "/Applications/Slack.app" }}
                  title="Open in Slack"
                  onAction={() => {
                    isUser ? openChat(teamId, id) : openChannel(teamId, id);
                    visitItem(item);
                  }}
                />

                <ActionPanel.Section>
                  <Action icon={Icon.ArrowCounterClockwise} title="Reset Ranking" onAction={() => resetRanking(item)} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default withSlackClient(Search);
