import { Icon, LaunchType, MenuBarExtra, Toast, launchCommand, showToast } from "@raycast/api";
import { getErrorMessage, getFriendlyName, range } from "../../utils";
import { getMediaPlayerTitleAndArtist } from "./utils";
import { ha } from "../../common";
import { State } from "../../haapi";
import { CopyToClipboardMenubarItem } from "../menu";

function volumeRange() {
  return range(0.0, 1.0, 0.1);
}

export function MediaPlayerAllMenubarItem() {
  const launch = async () => {
    return launchCommand({ name: "mediaplayers", type: LaunchType.UserInitiated });
  };
  return (
    <MenuBarExtra.Item
      title="Open All Media Players"
      icon={Icon.Terminal}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onAction={launch}
    />
  );
}

function MediaPlayerVolumeItem(props: { state: State; volume: number }) {
  const v = props.volume;
  const setVolume = async () => {
    try {
      await ha.setVolumeLevelMedia(props.state.entity_id, v);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return <MenuBarExtra.Item key={v} title={`${Math.round(v * 100)}%`} onAction={setVolume} />;
}

function MediaPlayerVolumeSubmenu(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const vl: number | undefined = s.attributes.volume_level;
  if (vl === undefined) {
    return null;
  }
  return (
    <MenuBarExtra.Submenu title={`Volume ${Math.round(vl * 100.0)}%`} icon={Icon.SpeakerOn}>
      {volumeRange().map((v) => (
        <MediaPlayerVolumeItem key={v} state={s} volume={v} />
      ))}
    </MenuBarExtra.Submenu>
  );
}

function MediaPlayerPlayPauseMenubarItem(props: { state: State }): JSX.Element | null {
  const s = props.state;
  return (
    <MenuBarExtra.Item
      title={s.state === "playing" ? "Pause" : "Play"}
      icon={s.state === "playing" ? Icon.Pause : Icon.Play}
      onAction={() => ha.playPauseMedia(s.entity_id)}
      tooltip={`State: ${s.state}`}
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
  const title = mediaTitle ? `${friendlyName} | ${mediaTitle}` : friendlyName;
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
      <MediaPlayerVolumeSubmenu state={s} />
      {mediaTitle && <CopyToClipboardMenubarItem title="Copy Track" content={mediaTitle} />}
      <CopyToClipboardMenubarItem title="Copy Entity ID" content={s.entity_id} tooltip={s.entity_id} />
    </MenuBarExtra.Submenu>
  );
}
