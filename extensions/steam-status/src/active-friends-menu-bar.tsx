import { MenuBarExtra, open } from "@raycast/api";
import useActiveFriends from "./hooks/use-active-friends";
import { useLocalStorage } from "@raycast/utils";

export default function CommandMenuBar() {
  const { value: steamId } = useLocalStorage<string>("user-id");
  const { value: steamApiKey } = useLocalStorage<string>("api-key");

  const { data } = useActiveFriends(steamId, steamApiKey);

  if (!steamId || !steamApiKey) {
    return (
      <MenuBarExtra
        icon="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg"
        tooltip="Steam Active Friends"
      >
        <MenuBarExtra.Item title="Active friends" />
        <MenuBarExtra.Item title="Please setup your credentials first" />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg"
      tooltip="Steam Active Friends"
    >
      <MenuBarExtra.Item title="Active friends" />

      {data?.map((item) => (
        <MenuBarExtra.Item
          key={item.steamid}
          icon={item.avatarmedium}
          title={item.personaname}
          subtitle={item.gameextrainfo}
          onAction={() => {
            open(item.profileurl);
          }}
        />
      ))}
    </MenuBarExtra>
  );
}
