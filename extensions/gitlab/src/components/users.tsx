import {
  ActionPanel,
  CopyToClipboardAction,
  ImageMask,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { User } from "../gitlabapi";
import { gitlab } from "../common";
import { useState, useEffect } from "react";

export function UserList() {
  const [searchText, setSearchText] = useState<string>();
  const { users, error, isLoading } = useSearch(searchText);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Merge Requests", error);
  }

  if (!users) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <List searchBarPlaceholder="Filter Users by name..." onSearchTextChange={setSearchText} isLoading={isLoading}>
      {users?.map((user) => (
        <UserListItem key={user.id} user={user} />
      ))}
    </List>
  );
}

export function UserListItem(props: { user: User }) {
  const user = props.user;
  return (
    <List.Item
      id={user.id.toString()}
      title={user.name}
      subtitle={"#" + user.username}
      icon={{ source: user.avatar_url, mask: ImageMask.Circle }}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={user.web_url} />
          <CopyToClipboardAction title="Copy User ID" content={user.id} />
          <CopyToClipboardAction title="Copy Username" content={user.username} />
          <CopyToClipboardAction title="Copy Name" content={user.name} />
        </ActionPanel>
      }
    />
  );
}

export function useSearch(query: string | undefined): {
  users?: User[];
  error?: string;
  isLoading: boolean;
} {
  const [users, setUsers] = useState<User[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (query === null || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const glUsers = await gitlab.getUsers({ searchText: query || "", searchIn: "title" });

        if (!cancel) {
          setUsers(glUsers);
        }
      } catch (e: any) {
        if (!cancel) {
          setError(e.message);
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { users, error, isLoading };
}
