import { List } from "@raycast/api";
import { useState } from "react";
import { CastAuthor } from "./utils/types";
import { useGetProfiles } from "./hooks/useGetProfiles";
import { ProfileDetails } from "./components/ProfileDetails";

export default function SearchUsers() {
  const [query, setQuery] = useState("");
  const { data, isLoading, pagination } = useGetProfiles(query);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type username or fid"
      onSearchTextChange={setQuery}
      pagination={pagination}
      throttle
      isShowingDetail={!!query}
    >
      <List.EmptyView title="No Profiles" description="Search by username or fid" icon="no-view.png" />
      {(data as CastAuthor[])?.map((user) => (
        <ProfileDetails key={user.username} user={user} />
      ))}
    </List>
  );
}
