import { Color, MenuBarExtra } from "@raycast/api";
import { getErrorMessage, getFriendlyName } from "./utils";
import { useHAStates } from "./hooks";
import { MenuBarItemConfigureCommand } from "./components/menu";
import { MediaPlayerMenubarItem } from "./components/mediaplayer/menu";

export default function MediaPlayerMenuCommand(): JSX.Element {
  const { states, error, isLoading } = useHAStates();
  const mediaPlayers = states
    ?.filter((s) => s.entity_id.startsWith("media_player"))
    .sort((a, b) => getFriendlyName(a).localeCompare(getFriendlyName(b)));
  let header = "Mediaplayers";
  if (error) {
    header = getErrorMessage(error);
  }
  console.log(`${isLoading} ${mediaPlayers?.length}`);
  return (
    <MenuBarExtra
      icon={{ source: "mediaplayer.png", tintColor: Color.PrimaryText }}
      isLoading={isLoading}
      tooltip={"Home Assistant Mediaplayers"}
    >
      <MenuBarExtra.Item key="_header" title={header} />
      <MenuBarExtra.Section title="Media Players">
        {mediaPlayers?.map((m) => <MediaPlayerMenubarItem key={m.entity_id} state={m} />)}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
