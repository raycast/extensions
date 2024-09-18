import { List, showToast, Toast } from "@raycast/api";
import { ReactElement, useState } from "react";
import { UserV1 } from "twitter-api-v2";
import { UserListItem } from "./user";
import { twitterClient, useRefresher } from "../lib/twitterapi";

export function UserList() {
  const [query, setQuery] = useState<string | undefined>();
  // eslint-disable-next-line
  const { data, error, isLoading, fetcher } = useRefresher<UserV1[] | undefined>(async (): Promise<
    UserV1[] | undefined
  > => {
    if (query && query.length > 0 && query !== "@") {
      const userdata = await twitterClient().v1.searchUsers(query);
      const users: UserV1[] = [];
      for (const u of userdata) {
        users.push(u);
      }
      return users;
    } else {
      return undefined;
    }
  }, [query]);
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search User by Name of Handle (e.g. @tonka_2000 or Michael Aigner)..."
      onSearchTextChange={setQuery}
      throttle={true}
    >
      {data?.map((u) => <UserListItem key={u.screen_name} user={u} />)}
    </List>
  );
}

export function UserSearchRoot(): ReactElement {
  return <UserList />;
}
