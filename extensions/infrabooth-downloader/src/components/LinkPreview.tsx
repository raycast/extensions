import { Form } from "@raycast/api";
import { formatTrackCount } from "../lib/downloadLink";
import { formatDuration } from "../lib/format";
import type { ResolvedLink } from "../lib/resolveLink";

export function LinkPreview({ link }: { link: ResolvedLink | undefined }) {
  if (!link) return null;
  if (link.kind === "track") {
    const { track } = link;
    return (
      <>
        <Form.Description title="Track" text={`${track.title} · ${formatDuration(track.durationMs)}`} />
        <Form.Description title="Artist" text={track.artist} />
      </>
    );
  }
  const { playlist } = link;
  return (
    <>
      <Form.Description
        title="Playlist"
        text={`${playlist.title} · ${formatTrackCount(playlist.tracks.length, playlist.trackCount)}`}
      />
      <Form.Description title="Owner" text={playlist.owner} />
    </>
  );
}
