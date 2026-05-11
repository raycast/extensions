import { useCachedPromise } from "@raycast/utils";
import { featurebase } from "./featurebase";
import { Icon, List } from "@raycast/api";
import { useState } from "react";

export default function ManageUsers() {
  const [searchText, setSearchText] = useState("");
  const {
    isLoading,
    data: users,
    pagination,
  } = useCachedPromise(
    (q: string) => async (options) => {
      const result = await featurebase.organization.identifyUser.query({ page: options.page + 1, q });
      return {
        data: result.results,
        hasMore: result.totalResults > result.page * result.limit,
      };
    },
    [searchText],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setSearchText} throttle>
      {users.map((user) => (
        <List.Item
          key={user.id}
          icon={{ source: user.profilePicture, fallback: Icon.Person }}
          title={user.name}
          subtitle={user.email}
        />
      ))}
    </List>
  );
}
