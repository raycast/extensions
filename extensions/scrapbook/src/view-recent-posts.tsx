import { Action, ActionPanel, Color, Icon, launchCommand, LaunchProps, LaunchType, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Post } from "../lib/types";
import { useEffect, useState } from "react";

const colors = [Color.Magenta, Color.Red, Color.Blue, Color.Green, Color.Yellow, Color.Purple, Color.Orange];

export default function ViewRecentPosts(props: LaunchProps) {
  const {
    isLoading: isPostsLoading,
    data: postsData,
    revalidate: postsRevalidate,
  } = useFetch<Post[]>("https://scrapbook.hackclub.com/api/posts");

  const [filteredUser, setFilteredUser] = useState<string | undefined>(undefined);
  const [filteredData, setFilteredData] = useState<Post[] | undefined>(undefined);

  const uniqueUsernames = postsData ? Array.from(new Set(postsData.map((post) => post.user.username))) : [];

  useEffect(() => {
    if (filteredUser && filteredUser !== "") {
      setFilteredData(postsData?.filter((post) => post.user.username === filteredUser));
    } else {
      setFilteredData(postsData);
    }
  }, [filteredUser]);

  return (
    <List
      isLoading={isPostsLoading}
      searchBarAccessory={
        <ListUsersDropdown usernames={uniqueUsernames} setUser={setFilteredUser} launchProps={props} />
      }
      isShowingDetail
    >
      {filteredData?.map((post: Post) => {
        const readableDate = new Date(post.postedAt).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const readableTime = new Date(post.postedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });

        const fullReadableDateTime = `${readableDate} at ${readableTime}`;

        return (
          <List.Item
            key={post.id}
            title={post.text}
            subtitle={post.user.username}
            detail={
              <List.Item.Detail
                markdown={post.text + post.attachments.map((a) => `![${"image"}](${a})`).join("\n")}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Reactions">
                      {post.reactions.map((reaction) => {
                        return (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={reaction.name}
                            icon={reaction.url}
                            text={reaction.name
                              .split("-")
                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(" ")}
                          />
                        );
                      })}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Date Posted"
                      icon={Icon.Clock}
                      text={fullReadableDateTime}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Author">
                      <List.Item.Detail.Metadata.TagList.Item
                        color={colors[Math.floor(Math.random() * colors.length)]}
                        icon={Icon.Person}
                        text={post.user.username}
                        onAction={async () => {
                          await launchCommand({
                            name: "search-users",
                            type: LaunchType.UserInitiated,
                            context: { username: post.user.username },
                          });
                        }}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link
                      title="Slack Link"
                      target={post.slackUrl || ""}
                      text={post.slackUrl ? "Open Slack" : "No Slack URL"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={async () => postsRevalidate()} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function ListUsersDropdown(props: { usernames: string[]; setUser: (user: string) => void; launchProps: LaunchProps }) {
  const { launchProps, usernames, setUser } = props;
  return (
    <>
      <List.Dropdown
        tooltip="Select User"
        value={launchProps.launchContext?.username || ""}
        onChange={(selectedItem) => {
          setUser(selectedItem);
        }}
      >
        <List.Dropdown.Item title="All Users" value={""} />
        <List.Dropdown.Section title="Users">
          {usernames.map((username: string) => (
            <List.Dropdown.Item key={username} title={username} value={username} />
          ))}
        </List.Dropdown.Section>
      </List.Dropdown>
    </>
  );
}
