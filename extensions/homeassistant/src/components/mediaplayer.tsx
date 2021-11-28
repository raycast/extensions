import { ActionPanel, Icon, Color, CopyToClipboardAction } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

export function getMediaPlayerTitleAndArtist(state: State): string | undefined {
  const title = state.attributes.media_title;
  const artist = state.attributes.media_artist;
  if (title && artist) {
    return `${artist} - ${title}`;
  }
  return undefined;
}

export function SelectSourceAction(props: { state: State }): JSX.Element | null {
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
        icon={{ source: Icon.TextDocument, tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      >
        {sl.map((s) => (
          <ActionPanel.Item key={`${s}`} title={`${s}`} onAction={() => handle(`${s}`)} />
        ))}
      </ActionPanel.Submenu>
    );
  }
  return null;
}

export function SelectVolumeAction(props: { state: State }): JSX.Element | null {
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
          <ActionPanel.Item key={`${s}`} title={`${s}%`} onAction={() => handle(s / 100)} />
        ))}
      </ActionPanel.Submenu>
    );
  }
  return null;
}

export function CopyTrackToClipboard(props: { state: State }): JSX.Element | null {
  const state = props.state;
  const song = getMediaPlayerTitleAndArtist(state);
  if (song) {
    return (
      <CopyToClipboardAction title="Copy Track" content={song} shortcut={{ modifiers: ["cmd", "shift"], key: "t" }} />
    );
  }
  return null;
}
