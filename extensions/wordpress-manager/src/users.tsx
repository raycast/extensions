import { Action, ActionPanel, Color, Detail, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import {
  useUsers,
  useCurrentUser,
  WPUser,
  formatDate,
  getRoleColor,
  getRoleLabel,
  getEditUserUrl,
  getAdminUrl,
} from "./utils";

type RoleFilter = "all" | "administrator" | "editor" | "author" | "contributor" | "subscriber";

function UserDetail({ user }: { user: WPUser }) {
  const avatarUrl = user.avatar_urls?.["96"] || user.avatar_urls?.["48"];
  const role = user.roles?.[0];

  const markdown = `
# ${user.name}

${avatarUrl ? `![Avatar](${avatarUrl})` : ""}

${user.description || "_No biography_"}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={user.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Username" text={user.username || user.slug} />
          <Detail.Metadata.Label title="Display Name" text={user.name} />
          {user.email && <Detail.Metadata.Label title="Email" text={user.email} />}
          {role && (
            <Detail.Metadata.TagList title="Role">
              <Detail.Metadata.TagList.Item text={getRoleLabel(role)} color={getRoleColor(role)} />
            </Detail.Metadata.TagList>
          )}
          {user.url && <Detail.Metadata.Link title="Website" target={user.url} text={user.url} />}
          {user.registered_date && (
            <Detail.Metadata.Label title="Registered" text={formatDate(user.registered_date, "MMMM d, yyyy")} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Profile Page" target={user.link} text="View Profile" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View Profile" url={user.link} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <Action.OpenInBrowser
            title="Edit in Wordpress"
            url={getEditUserUrl(user.id)}
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
          {user.email && (
            <Action.CopyToClipboard
              title="Copy Email"
              content={user.email}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function ManageUsers() {
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const { data: currentUser } = useCurrentUser();
  const {
    data: users,
    isLoading,
    revalidate,
  } = useUsers({
    search: searchText || undefined,
    roles: roleFilter === "all" ? undefined : roleFilter,
    per_page: 50,
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search users..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Role"
          value={roleFilter}
          onChange={(value) => setRoleFilter(value as RoleFilter)}
        >
          <List.Dropdown.Item title="All Users" value="all" />
          <List.Dropdown.Item title="Administrators" value="administrator" />
          <List.Dropdown.Item title="Editors" value="editor" />
          <List.Dropdown.Item title="Authors" value="author" />
          <List.Dropdown.Item title="Contributors" value="contributor" />
          <List.Dropdown.Item title="Subscribers" value="subscriber" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Person}
        title="No users found"
        description={searchText ? "Try a different search term" : "No users match the selected role"}
      />

      {users?.map((user) => {
        const avatarUrl = user.avatar_urls?.["48"] || user.avatar_urls?.["24"];
        const role = user.roles?.[0];
        const isCurrentUser = currentUser?.id === user.id;

        return (
          <List.Item
            key={user.id}
            title={user.name}
            subtitle={user.username || user.slug}
            icon={avatarUrl ? { source: avatarUrl, mask: Image.Mask.Circle } : Icon.Person}
            accessories={[
              isCurrentUser ? { tag: { value: "You", color: Color.Blue } } : {},
              role ? { tag: { value: getRoleLabel(role), color: getRoleColor(role) } } : {},
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push title="View Details" icon={Icon.Eye} target={<UserDetail user={user} />} />
                  <Action.OpenInBrowser
                    title="View Profile"
                    url={user.link}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.OpenInBrowser
                    title="Edit in Wordpress"
                    url={getEditUserUrl(user.id)}
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  {user.email && (
                    <Action.CopyToClipboard
                      title="Copy Email"
                      content={user.email}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  )}
                  <Action.CopyToClipboard title="Copy Profile URL" content={user.link} />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Add New User"
                    url={getAdminUrl("user-new.php")}
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
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
