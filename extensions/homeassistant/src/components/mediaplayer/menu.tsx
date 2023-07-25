import { Icon, MenuBarExtra } from "@raycast/api";
import { getFriendlyName } from "../../utils";
import { getMediaPlayerTitleAndArtist } from "./utils";
import { ha } from "../../common";
import { State } from "../../haapi";

function MediaPlayerPlayPauseMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  return (
    <MenuBarExtra.Item
      title={s.state === "playing" ? "Pause" : "Play"}
      icon={s.state === "playing" ? Icon.Pause : Icon.Play}
      onAction={() => ha.playPauseMedia(s.entity_id)}
    />
  );
}

function MediaPlayerNextMenubarItem(props: { state: State }): JSX.Element | null {
  if (props.state.state !== "playing") {
    return null;
  }
  return <MenuBarExtra.Item title="Next" icon={Icon.Forward} onAction={() => ha.nextMedia(props.state.entity_id)} />;
}

function MediaPlayerPreviousMenubarItem(props: { state: State }): JSX.Element | null {
  if (props.state.state !== "playing") {
    return null;
  }
  return (
    <MenuBarExtra.Item title="Previous" icon={Icon.Rewind} onAction={() => ha.previousMedia(props.state.entity_id)} />
  );
}

export function MediaPlayerMenubarItem(props: { state: State }): JSX.Element | null {
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
      <MediaPlayerPlayPauseMenubarItem state={s} />
      <MediaPlayerNextMenubarItem state={s} />
      <MediaPlayerPreviousMenubarItem state={s} />
    </MenuBarExtra.Submenu>
  );
}
