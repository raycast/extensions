import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { searchUsers, userProjects } from "./api";
import { DirectoryEmptyView, isExpected } from "./components/DirectoryEmptyView";
import { ProjectCopyActions, ProjectListItem, ProjectOpenActions } from "./components/ProjectListItem";
import { User } from "./types";

const followers = new Intl.NumberFormat("en", { notation: "compact" });
const countries = new Intl.DisplayNames("en", { type: "region" });

// Only the geocoded place: the location makers type themselves is often a joke or emoji.
function place(user: User) {
  const country = user.country_code ? countries.of(user.country_code) : undefined;
  return [user.city, country].filter(Boolean).join(", ");
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  const {
    data: users,
    isLoading,
    error,
    pagination,
  } = useCachedPromise(
    (q: string, sort: string) =>
      async ({ cursor }: { cursor?: string }) => {
        const page = await searchUsers({ q, sort, cursor });
        return { data: page.data, hasMore: page.has_more, cursor: page.next_cursor ?? undefined };
      },
    [query, sort],
    { keepPreviousData: true, onError: (error) => (isExpected(error) ? undefined : console.error(error)) },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      throttle
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search makers by name, bio or location…"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" storeValue onChange={setSort}>
          <List.Dropdown.Item title="Newest" value="newest" />
          <List.Dropdown.Item title="Most Followed" value="popular" />
        </List.Dropdown>
      }
    >
      {error || !users?.length ? (
        isLoading && !error ? null : (
          <DirectoryEmptyView error={error} noun="makers" />
        )
      ) : (
        users.map((user) => <MemberListItem key={user.id} user={user} />)
      )}
    </List>
  );
}

function MemberListItem({ user }: { user: User }) {
  const accessories: List.Item.Accessory[] = [];
  if (user.verified) {
    accessories.push({ icon: { source: Icon.CheckRosette, tintColor: Color.Blue }, tooltip: "Verified member" });
  }
  if (place(user)) accessories.push({ icon: Icon.Pin, text: place(user) });
  if (user.x_followers_count != null) {
    accessories.push({ icon: Icon.TwoPeople, text: followers.format(user.x_followers_count), tooltip: "X followers" });
  }

  return (
    <List.Item
      title={user.name ?? `@${user.username}`}
      subtitle={user.name ? `@${user.username}` : undefined}
      icon={user.avatar_url ? { source: user.avatar_url, mask: Image.Mask.Circle, fallback: Icon.Person } : Icon.Person}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Profile" url={user.profile_url} />
          <Action.Push title="Show Projects" icon={Icon.AppWindowList} target={<MemberProjects user={user} />} />
          <Action.OpenInBrowser
            title="Open on X"
            icon={Icon.AtSymbol}
            url={`https://x.com/${user.username}`}
            shortcut={{ modifiers: ["cmd"], key: "x" }}
          />
          {user.website_url && (
            <Action.OpenInBrowser
              title="Open Website"
              icon={Icon.Link}
              url={user.website_url}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Profile Link"
            content={user.profile_url}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

function MemberProjects({ user }: { user: User }) {
  const { data: projects, isLoading, error } = useCachedPromise(userProjects, [user.id]);

  return (
    <List isLoading={isLoading} navigationTitle={`@${user.username}'s Projects`}>
      {error || !projects?.length ? (
        isLoading && !error ? null : (
          <DirectoryEmptyView error={error} noun="projects" />
        )
      ) : (
        projects.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            actions={
              <ActionPanel>
                <ProjectOpenActions project={project} />
                <ProjectCopyActions project={project} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
