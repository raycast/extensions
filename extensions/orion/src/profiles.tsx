import { List } from "@raycast/api";
import useProfiles from "./hooks/useProfiles";
import ProfileListItem from "./components/ProfileListItem";

export default function Command() {
  const { profiles } = useProfiles();

  return (
    <List isLoading={!profiles} searchBarPlaceholder="Search by title or domain name">
      {profiles && <ProfileListItem profile={profiles.default} />}
      {profiles?.profiles.map((p) => <ProfileListItem profile={p} />)}
    </List>
  );
}
