import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pathToFileURL } from "url";
import { useEffect, useRef, useState } from "react";
import { createConnection, FeishinConnection } from "../feishin";
import { getCoverArtUrl } from "../navidrome";
import { ClientEvent, QueueSong, ServerEvent, SongState } from "../types";

export interface FeishinState extends SongState {
  isLoading: boolean;
  error: string | null;
  albumArt: string | null;
}

function resolveAlbumArt(song: QueueSong): string | null {
  const artId = song.imageId || song.albumId;
  if (artId) {
    const url = getCoverArtUrl(artId);
    if (url) return url;
  }
  return null;
}

export function useFeishinState() {
  const [state, setState] = useState<FeishinState>({
    isLoading: true,
    error: null,
    albumArt: null,
  });
  const connRef = useRef<FeishinConnection | null>(null);

  useEffect(() => {
    const conn = createConnection(
      (event: ServerEvent) => {
        switch (event.event) {
          case "state": {
            setState((prev) => ({
              ...prev,
              ...event.data,
              isLoading: false,
              error: null,
            }));
            if (event.data.song) {
              const artUrl = resolveAlbumArt(event.data.song);
              if (artUrl) {
                setState((prev) => ({ ...prev, albumArt: artUrl }));
              } else {
                conn.send({ event: "proxy" });
              }
            }
            break;
          }
          case "song": {
            const song = event.data;
            setState((prev) => ({
              ...prev,
              song: song ?? undefined,
              albumArt: null,
            }));
            if (song) {
              const artUrl = resolveAlbumArt(song);
              if (artUrl) {
                setState((prev) => ({ ...prev, albumArt: artUrl }));
              } else {
                conn.send({ event: "proxy" });
              }
            }
            break;
          }
          case "playback":
            setState((prev) => ({ ...prev, status: event.data }));
            break;
          case "volume":
            setState((prev) => ({ ...prev, volume: event.data }));
            break;
          case "repeat":
            setState((prev) => ({ ...prev, repeat: event.data }));
            break;
          case "shuffle":
            setState((prev) => ({ ...prev, shuffle: event.data }));
            break;
          case "position":
            setState((prev) => ({ ...prev, position: event.data }));
            break;
          case "favorite":
            setState((prev) => {
              if (!prev.song || prev.song.id !== event.data.id) return prev;
              return {
                ...prev,
                song: { ...prev.song, userFavorite: event.data.favorite },
              };
            });
            break;
          case "proxy": {
            try {
              const tmpPath = join(tmpdir(), "feishin-coverart.jpg");
              writeFileSync(tmpPath, Buffer.from(event.data, "base64"));
              setState((prev) => ({
                ...prev,
                albumArt: pathToFileURL(tmpPath).href,
              }));
            } catch (e) {
              void e;
            }
            break;
          }
          case "error":
            setState((prev) => ({ ...prev, error: event.data }));
            break;
        }
      },
      (err) =>
        setState((prev) => ({ ...prev, isLoading: false, error: err.message })),
      () => setState((prev) => ({ ...prev, isLoading: false })),
    );

    connRef.current = conn;
    return () => conn.close();
  }, []);

  const send = (event: ClientEvent) => connRef.current?.send(event);
  return { state, send };
}
