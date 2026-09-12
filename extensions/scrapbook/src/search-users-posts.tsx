import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { PostType, UserType } from "./lib/types";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import Fuse from "fuse.js";
import Post from "./components/post";
import { ReactionsDropdown } from "./components/reactions-dropdown";
import { useReactionFiltering } from "./lib/hooks";

type UserInfo = {
  profile: UserType;
  posts: PostType[];
  webring: string[];
};

export default function SearchUsersPosts(props: LaunchProps) {
  const [searchText, setSearchText] = useState<string>("");
  const [searchUsers, setSearchUsers] = useState<UserType[]>([]);
  const [directMatch, setDirectMatch] = useState<UserType | null>(null);
  const { isLoading, data: usersData } = useFetch<UserType[]>("https://scrapbook.hackclub.com/api/users", {
    execute: searchText.length > 0,
    parseResponse: (response) => response.json(),
  });

  useEffect(() => {
    if (usersData) {
      const fuse = new Fuse<UserType>(usersData, {
        keys: ["username"],
        threshold: 0.3,
      });
      const results = fuse.search(searchText);
      const topResults = results.slice(0, 10);
      if (topResults.length > 0 && topResults[0].item.username.toLowerCase() === searchText.toLowerCase()) {
        setDirectMatch(topResults[0].item);
        setSearchUsers(topResults.slice(1).map((result) => result.item));
      } else {
        setDirectMatch(null);
        setSearchUsers(topResults.map((result) => result.item));
      }
    }
  }, [usersData, searchText]);

  if (props.launchContext?.username) {
    return <UserPosts username={props.launchContext.username} />;
  } else {
    return (
      <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
        {directMatch ? (
          <List.Section title="Direct Match">
            <List.Item
              key={directMatch.id}
              title={directMatch.username}
              icon={Icon.Person}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Posts"
                    icon={Icon.Person}
                    target={<UserPosts username={directMatch.username} />}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        ) : null}

        <List.EmptyView
          title={searchText.length > 0 ? "No users found" : `${usersData?.length || 0} users loaded`}
          description={searchText.length > 0 ? "No users match the current search query" : "Begin typing to search"}
          icon={Icon.Person}
        />
        <List.Section title="Other Users">
          {searchUsers.map((user) => (
            <List.Item
              key={user.id}
              title={user.username}
              icon={Icon.Person}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Profile"
                    icon={Icon.Person}
                    target={<UserPosts username={user.username} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }
}

function UserPosts({ username }: { username: string }) {
  const { isLoading, data, revalidate } = useFetch<UserInfo>(`https://scrapbook.hackclub.com/api/users/${username}`, {
    parseResponse: (response) => response.json(),
  });
  const { selectedReaction, setSelectedReaction, filteredData } = useReactionFiltering(data?.posts || []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={data ? `${data.profile.username}'s Posts` : "Unknown User"}
      searchBarPlaceholder={data ? `Search ${data.posts.length} Posts` : undefined}
      searchBarAccessory={
        <ReactionsDropdown
          posts={data?.posts || []}
          selectedReaction={selectedReaction}
          setSelectedReaction={setSelectedReaction}
        />
      }
      isShowingDetail
    >
      {filteredData.map((post: PostType) => {
        post.user = { ...data!.profile };
        return <Post key={post.id} post={post} setSelectedReaction={setSelectedReaction} revalidate={revalidate} />;
      })}
    </List>
  );
}
