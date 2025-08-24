import { EntityStandardActionSections } from "@components/entity";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import React from "react";
import { getMediaPlayerTitleAndArtist } from "./utils";

export function SelectSourceAction(props: { state: State }): React.ReactElement | null {
  const state = props.state;
  let sl = state.attributes.source_list as string[] | undefined;
  const handle = async (source: string) => {
    if (source) {
      await ha.selectSourceMedia(state.entity_id, source);
    }
  };

  const actualSource = state.attributes.source;
  const title = actualSource ? `Select Source (${actualSource})` : "Select Source";

  if (sl && Array.isArray(sl)) {
    if (actualSource) {
      sl = sl?.filter((s) => s !== actualSource);
    }
    return (
      <ActionPanel.Submenu
        title={title}
        icon={{ source: Icon.BlankDocument, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      >
        {sl.map((s) => (
          <Action key={`${s}`} title={`${s}`} onAction={() => handle(`${s}`)} />
        ))}
      </ActionPanel.Submenu>
    );
  }
  return null;
}

export function SelectVolumeAction(props: { state: State }): React.ReactElement | null {
  const state = props.state;
  const handle = async (volumeLevel: number) => {
    await ha.setVolumeLevelMedia(state.entity_id, volumeLevel);
  };
  const av = state.attributes.volume_level;

  const sl = Array(100)
    .fill(undefined)
    .map((_, index) => index + 1);
  const title = av ? `Select Volume (${Math.round(av * 100)}%)` : "Select Volume";

  if (sl && Array.isArray(sl)) {
    return (
      <ActionPanel.Submenu
        title={title}
        icon={{ source: Icon.Circle, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
      >
        {sl.map((s) => (
          <Action key={`${s}`} title={`${s}%`} onAction={() => handle(s / 100)} />
        ))}
      </ActionPanel.Submenu>
    );
  }
  return null;
}

export function CopyTrackToClipboard(props: { state: State }): React.ReactElement | null {
  const state = props.state;
  const song = getMediaPlayerTitleAndArtist(state);
  if (song) {
    return (
      <Action.CopyToClipboard title="Copy Track" content={song} shortcut={{ modifiers: ["cmd", "shift"], key: "t" }} />
    );
  }
  return null;
}

export function MediaPlayerTurnOnAction(props: { state: State }): React.ReactElement | null {
  const state = props.state;
  const handle = async () => {
    await ha.callService("media_player", "turn_on", { entity_id: state.entity_id });
  };
  const s = state.state;
  if (s !== "off" && s !== "standby") {
    return null;
  }

  return (
    <Action
      title="Turn On"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      icon={{ source: "power-on.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function MediaPlayerTurnOffAction(props: { state: State }): React.ReactElement | null {
  const state = props.state;
  const handle = async () => {
    await ha.callService("media_player", "turn_off", { entity_id: state.entity_id });
  };
  const s = state.state;
  if (s === "off") {
    return null;
  }

  return (
    <Action
      title="Turn Off"
      onAction={handle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      icon={{ source: "power-off.svg", tintColor: Color.PrimaryText }}
    />
  );
}

export function MediaPlayerActionPanel(props: { state: State }) {
  const state = props.state;
  const entityID = state.entity_id;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Controls">
        <Action
          // eslint-disable-next-line @raycast/prefer-title-case
          title="Play/Pause"
          onAction={async () => await ha.playPauseMedia(entityID)}
          icon={{ source: "play-pause.svg", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Play"
          onAction={async () => await ha.playMedia(entityID)}
          icon={{ source: "play.svg", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Pause"
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={async () => await ha.pauseMedia(entityID)}
          icon={{ source: "pause.svg", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Stop"
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={async () => await ha.stopMedia(entityID)}
          icon={{ source: "stop.svg", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Next"
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          onAction={async () => await ha.nextMedia(entityID)}
          icon={{ source: "skip-next.svg", tintColor: Color.PrimaryText }}
        />
        <Action
          title="Previous"
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={async () => await ha.previousMedia(entityID)}
          icon={{ source: "skip-previous.svg", tintColor: Color.PrimaryText }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Volume">
        <Action
          title="Volume Up"
          shortcut={{ modifiers: ["cmd"], key: "+" }}
          onAction={async () => await ha.volumeUpMedia(entityID)}
          icon={{ source: Icon.SpeakerUp, tintColor: Color.PrimaryText }}
        />
        <Action
          title="Volume Down"
          shortcut={{ modifiers: ["cmd"], key: "-" }}
          onAction={async () => await ha.volumeDownMedia(entityID)}
          icon={{ source: Icon.SpeakerDown, tintColor: Color.PrimaryText }}
        />
        <SelectVolumeAction state={state} />
        <Action
          title="Mute"
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={async () => await ha.muteMedia(entityID)}
          icon={{ source: Icon.SpeakerOff, tintColor: Color.PrimaryText }}
        />
        <SelectSourceAction state={state} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Power">
        <MediaPlayerTurnOnAction state={state} />
        <MediaPlayerTurnOffAction state={state} />
      </ActionPanel.Section>
      <EntityStandardActionSections state={state} />
    </ActionPanel>
  );
}
