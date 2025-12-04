import { List } from "@raycast/api";
import { Cast, CastAuthor } from "../utils/types";
import CastListItem from "./CastListItem";
import { useGetProfileCasts } from "../hooks/useGetProfileCasts";
import { useMemo, useState } from "react";
import { Dropdown } from "./Dropdown";

interface ProfileCastListProps {
  user: CastAuthor;
}

const OPTIONS = [
  { label: "Casts Only", value: "casts_only" },
  { label: "Include Recasts", value: "include_recasts" },
];

export default function ProfileCastList({ user }: ProfileCastListProps) {
  const [option, setOption] = useState(OPTIONS[1]?.value);
  const { data, isLoading, pagination } = useGetProfileCasts(user.fid);

  function onDropdownChange(option: string) {
    setOption(option);
  }

  const filteredData = useMemo(() => {
    if (!data) return undefined;
    const castData = data as Cast[];
    return option === "casts_only" ? castData.filter((cast) => cast.author.username === user.username) : castData;
  }, [data, option, user.username]);

  return (
    <List
      isLoading={filteredData === null || isLoading}
      navigationTitle={`${user.username} casts`}
      searchBarPlaceholder="Filter cast keywords"
      pagination={pagination}
      searchBarAccessory={
        <Dropdown options={OPTIONS} onDropdownChange={onDropdownChange} value={option} tooltip="Cast Filter Options" />
      }
      throttle
    >
      <List.Section title="Recent Casts" subtitle={filteredData ? filteredData.length.toString() : undefined}>
        {(filteredData as Cast[])?.map((cast) => (
          <CastListItem key={cast.hash} cast={cast} user={user} showMeta />
        ))}
      </List.Section>
    </List>
  );
}
