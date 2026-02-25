import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type SongBioResponse = {
  response?: {
    song?: {
      title?: string;
      primary_artist?: {
        name?: string;
      };
      description?: {
        plain?: string;
      };
      description_preview?: string;
      url?: string;
    };
  };
};

function buildBioMarkdown(data: SongBioResponse | undefined, fallbackTitle?: string): string {
  const song = data?.response?.song;
  const title = song?.title || fallbackTitle || "Track";
  const artist = song?.primary_artist?.name || "";
  const description = song?.description?.plain?.trim() || song?.description_preview?.trim() || "";

  if (!description) {
    return [`# ${title}`, artist ? `### ${artist}` : "", "", "No Genius.com info is available for this track."]
      .filter(Boolean)
      .join("\n");
  }

  return [`# ${title}`, artist ? `### ${artist}` : "", "", description].filter(Boolean).join("\n");
}

export default function SongBioView({ songId, title }: { songId?: number; title?: string }) {
  const { data, isLoading } = useFetch<SongBioResponse>(
    songId ? `https://genius.com/api/songs/${songId}` : "https://genius.com/api/songs/1",
    {
      execute: !!songId,
    },
  );

  if (!songId) {
    return <Detail markdown="Track info is unavailable because this track does not have a Genius track ID." />;
  }

  if (isLoading && !data) {
    return (
      <Detail
        isLoading
        navigationTitle="Track Info"
        markdown={title ? `Loading info for **${title}**...` : "Loading track info..."}
      />
    );
  }

  return <Detail isLoading={isLoading} navigationTitle="Track Info" markdown={buildBioMarkdown(data, title)} />;
}
