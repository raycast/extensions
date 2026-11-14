import { Action, ActionPanel, Icon, Image, Keyboard, LaunchProps, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ReactNode } from "react";
import { ErrorView } from "./components/error-view";
import { PostFeedList } from "./components/post-feed-list";
import { ProfileDetail } from "./components/profile-screen";
import { IdleSearchView, SaveSearchAction, SearchAction, useSubmittedSearch } from "./components/submitted-search";
import { showErrorToast } from "./lib/error-toast";
import { uniqueById } from "./lib/feeds";
import { compactCount, profileLink } from "./lib/format";
import { Profile } from "./lib/schemas";
import { fetchUserPage } from "./lib/users";

const loadUserPage =
  (query: string) =>
  async ({ cursor }: { cursor?: string }) => {
    const { users, nextCursor } = await fetchUserPage(query, cursor);
    return { data: users, hasMore: nextCursor !== undefined, cursor: nextCursor };
  };

function UserRow({ user, firstAction, query }: { user: Profile; firstAction: ReactNode; query: string }) {
  const { followers, name, profilePicture, username } = user;
  return (
    <List.Item
      title={name}
      subtitle={`@${username}`}
      icon={{ source: profilePicture ?? Icon.Person, fallback: Icon.Person, mask: Image.Mask.Circle }}
      accessories={typeof followers === "number" ? [{ text: compactCount(followers), tooltip: "Followers" }] : []}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {firstAction}
            <Action.Push
              title="View Profile"
              icon={Icon.Person}
              target={<ProfileDetail profile={user} navigationTitle={`@${username}`} />}
            />
            <Action.Push
              title="View Posts"
              icon={Icon.List}
              target={<PostFeedList feed={{ kind: "userPosts", user: username }} navigationTitle={`@${username}`} />}
            />
            <Action.OpenInBrowser url={profileLink(username)} shortcut={Keyboard.Shortcut.Common.Open} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Profile Link"
              content={profileLink(username)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy Username"
              content={username}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <SaveSearchAction command="search-users" query={query} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command({
  arguments: { query },
  fallbackText,
}: LaunchProps<{ arguments: Arguments.SearchUsers }>) {
  const search = useSubmittedSearch("search-users", fallbackText ?? query);
  const isIdle = search.submitted === "";
  const { data, error, isLoading, pagination, revalidate } = useCachedPromise(loadUserPage, [search.submitted], {
    execute: !isIdle,
    onError: (failure) => {
      showErrorToast(failure, revalidate);
    },
  });
  const isWaiting = isIdle ? search.isLoadingRecents : isLoading || (!data && !error);
  const searchAction = <SearchAction search={search} />;

  function emptyView() {
    if (isWaiting) return null;
    if (isIdle) return <IdleSearchView search={search} />;
    if (error) return <ErrorView error={error} onRetry={revalidate} firstAction={searchAction} />;
    return (
      <List.EmptyView
        icon={Icon.Person}
        title="No Accounts Found"
        description="Try a different name or username."
        actions={<ActionPanel>{searchAction}</ActionPanel>}
      />
    );
  }

  return (
    <List
      filtering={false}
      isLoading={isWaiting}
      onSearchTextChange={search.setDraft}
      pagination={pagination}
      searchBarPlaceholder="Search Users"
      searchText={search.draft}
    >
      {emptyView()}
      {uniqueById(data ?? []).map((user) => (
        <UserRow key={user.id} user={user} firstAction={searchAction} query={search.submitted} />
      ))}
    </List>
  );
}
