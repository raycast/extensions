import { List, ActionPanel, Action, Icon, Clipboard, showHUD } from "@raycast/api";
import {
  getExtendedTrackMetadata,
  formatMetadataMarkdown,
  copyCoverArtFile,
  copyLyrics,
  showMainWindow,
  showMiniWindow,
  showLibraryStatistics,
  showEqualizer,
  showDeviceInspector,
} from "../helpers/swinsian";
import path from "path";

type ToolkitTrack = {
  id?: string;
  name: string;
  artist: string;
  album: string;
  path: string;
  genre?: string;
};

export function CopyItems({ track, type }: { track: ToolkitTrack; type: "metadata" | "paths" }) {
  return (
    <>
      {type === "metadata" ? (
        <>
          <List.Item
            icon={Icon.Person}
            title="Artist – Name"
            actions={
              <ActionPanel>
                <Action
                  title="Copy"
                  onAction={async () => {
                    await Clipboard.copy(`${track.artist} – ${track.name}`);
                    await showHUD("Copied");
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Cd}
            title="Artist – Album – Name"
            actions={
              <ActionPanel>
                <Action
                  title="Copy"
                  onAction={async () => {
                    await Clipboard.copy(`${track.artist} – ${track.album} – ${track.name}`);
                    await showHUD("Copied");
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Code}
            title="Track Info as JSON"
            actions={
              <ActionPanel>
                <Action
                  title="Copy JSON"
                  onAction={async () => {
                    const meta = await getExtendedTrackMetadata();
                    if (meta) {
                      await Clipboard.copy(JSON.stringify(meta, null, 2));
                      await showHUD("JSON report copied");
                    }
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Text}
            title="Track Info as Markdown"
            actions={
              <ActionPanel>
                <Action
                  title="Copy Markdown"
                  onAction={async () => {
                    const meta = await getExtendedTrackMetadata();
                    if (meta) {
                      await Clipboard.copy(formatMetadataMarkdown(meta));
                      await showHUD("Markdown report copied");
                    }
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Image}
            title="Copy Cover Art File"
            actions={
              <ActionPanel>
                <Action title="Copy Cover Art" onAction={async () => showHUD(await copyCoverArtFile())} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Text}
            title="Copy Lyrics"
            actions={
              <ActionPanel>
                <Action title="Copy Lyrics" onAction={async () => showHUD(await copyLyrics())} />
              </ActionPanel>
            }
          />
        </>
      ) : (
        <>
          <List.Item
            icon={Icon.Link}
            title="Artist Path"
            actions={
              <ActionPanel>
                <Action
                  title="Copy Artist Path"
                  onAction={async () => {
                    const dir = path.dirname(path.dirname(track.path));
                    await Clipboard.copy(dir);
                    await showHUD("Artist path copied");
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Link}
            title="Album Path"
            actions={
              <ActionPanel>
                <Action
                  title="Copy Album Path"
                  onAction={async () => {
                    const dir = path.dirname(track.path);
                    await Clipboard.copy(dir);
                    await showHUD("Album path copied");
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Music}
            title="Track Path"
            actions={
              <ActionPanel>
                <Action
                  title="Copy Track Path"
                  onAction={async () => {
                    await Clipboard.copy(track.path);
                    await showHUD("Track path copied");
                  }}
                />
              </ActionPanel>
            }
          />
        </>
      )}
    </>
  );
}

export function CopyList({ track, type }: { track: ToolkitTrack; type: "metadata" | "paths" }) {
  return (
    <List navigationTitle={type === "metadata" ? "Metadata Toolkit" : "Paths Toolkit"}>
      <CopyItems track={track} type={type} />
    </List>
  );
}
export function WindowsList() {
  const windows = [
    { title: "Show Main Window", icon: Icon.Window, action: showMainWindow },
    { title: "Show Mini Window", icon: Icon.Mobile, action: showMiniWindow },
    { title: "Library Statistics", icon: Icon.BarChart, action: showLibraryStatistics },
    { title: "Equalizer", icon: Icon.SpeakerHigh, action: showEqualizer },
    { title: "Track Inspector", icon: Icon.Info, action: showDeviceInspector },
  ];

  return (
    <List navigationTitle="Windows Toolkit">
      {windows.map((item) => (
        <List.Item
          key={item.title}
          icon={item.icon}
          title={item.title}
          actions={
            <ActionPanel>
              <Action title={item.title} icon={item.icon} onAction={item.action} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function MetadataList({ track }: { track: ToolkitTrack }) {
  return <CopyList track={track} type="metadata" />;
}

export function PathsList({ track }: { track: ToolkitTrack }) {
  return <CopyList track={track} type="paths" />;
}
