import { List } from "@raycast/api";
import useActiveFriends from "./hooks/use-active-friends";
import SetupForm from "./setup-form";
import { useLocalStorage } from "@raycast/utils";

export default function Command() {
  const { value: steamId } = useLocalStorage<string>("user-id");
  const { value: steamApiKey } = useLocalStorage<string>("api-key");

  const { data } = useActiveFriends(steamId, steamApiKey);

  console.log("AOEU", steamId, steamApiKey);

  if (!steamId || !steamApiKey) {
    return <SetupForm />;
  }

  return (
    <List>
      {data?.map((item) => (
        <List.Item key={item.steamid} icon={item.avatarmedium} title={item.personaname} subtitle={item.gameextrainfo} />
      ))}
    </List>
  );
}
