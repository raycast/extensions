import { Color, Icon, MenuBarExtra } from "@raycast/api";
import { getErrorMessage, getFriendlyName } from "./utils";
import { useHAStates } from "./hooks";
import { State } from "./haapi";
import { getMediaPlayerTitleAndArtist } from "./components/mediaplayer";
import { ha } from "./common";
import { MenuBarItemConfigureCommand } from "./components/menu";

function MediaPlayerMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (s.state === "unavailable") {
    return null;
  }
  const mediaTitle = getMediaPlayerTitleAndArtist(s);
  const friendlyName = getFriendlyName(s);
  const title = mediaTitle ? `${friendlyName} - ${mediaTitle}` : friendlyName;
  const icon = () => {
    let icon = s.state === "playing" ? Icon.SpeakerOn : "mediaplayer.png";
    const ep = s.attributes.entity_picture;
    if (ep) {
      icon = ha.urlJoin(ep);
    }
    return icon;
  };
  return (
    <MenuBarExtra.Submenu key={s.entity_id} title={title} icon={icon()}>
      <MenuBarExtra.Item
        title={s.state === "playing" ? "Pause" : "Play"}
        icon={s.state === "playing" ? Icon.Pause : Icon.Play}
        onAction={() => ha.playPauseMedia(s.entity_id)}
      />
      {s.state === "playing" && (
        <MenuBarExtra.Item title="Next" icon={Icon.Forward} onAction={() => ha.nextMedia(s.entity_id)} />
      )}
      {s.state === "playing" && (
        <MenuBarExtra.Item title="Previous" icon={Icon.Rewind} onAction={() => ha.previousMedia(s.entity_id)} />
      )}
    </MenuBarExtra.Submenu>
  );
}

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
      <MenuBarExtra.Section>
        {mediaPlayers?.map((m) => <MediaPlayerMenubarItem key={m.entity_id} state={m} />)}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
