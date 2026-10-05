import { Action, ActionPanel, Image, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { User } from "../gitlabapi";
import { gitlab } from "../common";
import { useState } from "react";
import { GitLabOpenInBrowserAction } from "./actions";

export function UserList() {
  const [searchText, setSearchText] = useState<string>();
  const { users, isLoading } = useSearch(searchText);

  return (
    <List searchBarPlaceholder="Filter Users by name..." onSearchTextChange={setSearchText} isLoading={isLoading}>
      {users?.map((user) => (
        <UserListItem key={user.id} user={user} />
      ))}
    </List>
  );
}

export function UserListItem(props: { user: User }) {
  return (
    <List.Item
      id={props.user.id.toString()}
      title={props.user.name}
      subtitle={props.user.username}
      icon={{ source: props.user.avatar_url, mask: Image.Mask.Circle }}
      actions={
        <ActionPanel>
          <GitLabOpenInBrowserAction url={props.user.web_url} />
          <Action.CopyToClipboard title="Copy User ID" content={props.user.id} />
          <Action.CopyToClipboard title="Copy Username" content={props.user.username} />
          <Action.CopyToClipboard title="Copy Name" content={props.user.name} />
        </ActionPanel>
      }
    />
  );
}

export function useSearch(query: string | undefined): {
  users?: User[];
  isLoading: boolean;
} {
  const { data, isLoading } = usePromise(
    (searchQuery: string) => gitlab.getUsers({ searchText: searchQuery, searchIn: "title" }),
    [query ?? ""],
  );
  return { users: data, isLoading };
}

export function userIcon(user: User): Image.ImageLike {
  return { source: user.avatar_url, mask: Image.Mask.Circle };
}

export function userTagOnAction(user: User): (() => void) | undefined {
  if (!user.web_url) {
    return undefined;
  }
  return () => open(user.web_url);
}
