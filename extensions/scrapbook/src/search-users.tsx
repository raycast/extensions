import { Action, ActionPanel, Color, Icon, Image, launchCommand, LaunchProps, LaunchType, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { User } from "../lib/types";

const pageSize = 100;

export default function SearchUsers(props: LaunchProps) {
  const { isLoading, data, revalidate } = useFetch<User[]>("https://scrapbook.hackclub.com/api/users");

  const [state, setState] = useState({
    data: [] as User[],
    hasMore: true,
    nextPage: 0,
    isLoadingMore: false,
  });

  const loadNextPage = useCallback(
    (nextPage: number) => {
      if (!data) return;

      setState((previous) => ({ ...previous, isLoadingMore: true }));

      const startIndex = nextPage * pageSize;
      const endIndex = startIndex + pageSize;
      const newData = data.slice(startIndex, endIndex);

      setState((previous) => ({
        ...previous,
        data: [...previous.data, ...newData.filter((newUser) => !previous.data.some((user) => user.id === newUser.id))],
        hasMore: endIndex < data.length,
        isLoadingMore: false,
        nextPage: nextPage + 1,
      }));
    },
    [data],
  );

  useEffect(() => {
    if (data && state.nextPage === 0) {
      loadNextPage(0);
    }
  }, [data, loadNextPage]);

  return (
    <List
      isLoading={isLoading}
      searchText={props.launchContext?.username}
      isShowingDetail
      pagination={{ onLoadMore: () => loadNextPage(state.nextPage), hasMore: state.hasMore, pageSize }}
    >
      {state.data.map((user: User) => (
        <List.Item
          key={user.id}
          title={user.username}
          icon={{ source: user.avatar, mask: Image.Mask.Circle }}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Name"
                    icon={{ source: user.avatar, mask: Image.Mask.Circle }}
                    text={user.username}
                  />
                  {user.pronouns ? (
                    <List.Item.Detail.Metadata.Label
                      title="Pronouns"
                      text={user.pronouns}
                      icon={Icon.SpeechBubbleActive}
                    />
                  ) : undefined}
                  {user.timezone ? (
                    <List.Item.Detail.Metadata.Label title="Timezone" text={user.timezone} icon={Icon.Clock} />
                  ) : undefined}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Email" icon={Icon.Envelope} text={user.email || "No email"} />
                  <List.Item.Detail.Metadata.Link
                    title="Website"
                    text={user.website || "No website"}
                    target={user.website || ""}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link
                    title="Github"
                    text={user.github || "No Github"}
                    target={user.github || ""}
                  />
                  <List.Item.Detail.Metadata.Link
                    title="Scrapbook Profile"
                    text={"Open Scrapbook"}
                    target={user.customDomain || "https://scrapbook.hackclub.com/" + encodeURIComponent(user.username)}
                  />
                  <List.Item.Detail.Metadata.TagList title="Posts">
                    <List.Item.Detail.Metadata.TagList.Item
                      icon={Icon.ArrowNe}
                      text={"View Recent Posts"}
                      onAction={() => {
                        launchCommand({
                          name: "view-recent-posts",
                          type: LaunchType.UserInitiated,
                          context: { username: user.username },
                        });
                      }}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  {user.displayStreak == true && (user.streaksToggledOff == null || user.streaksToggledOff == false) ? (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Streak Count"
                        icon={Icon.Bolt}
                        text={user.streakCount?.toString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Highest Streak"
                        icon={Icon.BoltDisabled}
                        text={user.maxStreaks?.toString()}
                      />
                    </>
                  ) : undefined}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Member Status">
                    {user.newMember ? (
                      <List.Item.Detail.Metadata.TagList.Item text={"New Member"} color={Color.Blue} />
                    ) : (
                      <List.Item.Detail.Metadata.TagList.Item text={"-"} />
                    )}
                    {user.fullSlackMember ? (
                      <List.Item.Detail.Metadata.TagList.Item text={"Full Slack Member"} color={Color.Green} />
                    ) : (
                      <List.Item.Detail.Metadata.TagList.Item text={"-"} />
                    )}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Scrapbook ID">
                    <List.Item.Detail.Metadata.TagList.Item text={user.id} />
                  </List.Item.Detail.Metadata.TagList>
                  {user.slackID ? (
                    <List.Item.Detail.Metadata.TagList title="Slack ID">
                      <List.Item.Detail.Metadata.TagList.Item text={user.slackID} />
                    </List.Item.Detail.Metadata.TagList>
                  ) : undefined}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={async () => revalidate()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
