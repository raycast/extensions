import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getLDAPUsers } from "./lib/ldap";
import { useState } from "react";
import { LDAPUserListItem } from "./components/user";

export default function Command() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { data, isLoading } = usePromise(
    async (searchQuery: string | undefined) => {
      if (!searchQuery || searchQuery.length < 3) {
        return [];
      }
      const user = await getLDAPUsers({ searchQuery });
      return user;
    },
    [searchQuery],
  );

  return (
    <List searchText={searchQuery} onSearchTextChange={setSearchQuery} isLoading={isLoading} throttle>
      {searchQuery.length >= 3 && data?.map((user) => <LDAPUserListItem key={user.samaccountname} user={user} />)}
      {searchQuery.length < 3 && (
        <List.EmptyView title="Enter at least 3 characters to Search for a Windows Domain User" icon={"domain.png"} />
      )}
    </List>
  );
}
