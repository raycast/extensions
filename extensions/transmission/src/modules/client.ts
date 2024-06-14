import { getPreferenceValues } from "@raycast/api";
import Transmission from "transmission-promise";
import useSWR, { useSWRConfig } from "swr";
import { SessionStats, Torrent, TorrentStatus } from "../types";
import { useCallback } from "react";
import { equals } from "ramda";

const INTERVAL = 5000;
const OPTIONS = { refreshInterval: INTERVAL };

const preferences = getPreferenceValues();
export const createClient = (): Transmission => {
  return new Transmission({
    host: preferences.host,
    port: Number(preferences.port),
    username: preferences.username,
    password: preferences.password,
    ssl: preferences.ssl,
  });
};

const transmission = createClient();

export const useTorrent = ({ id }: { id: number }) => {
  return useSWR<Torrent>(
    `/torrent/${id}`,
    async () => {
      const { torrents } = await transmission.get(id);
      const first = torrents[0] as Torrent;
      return first;
    },
    { refreshInterval: 1000 },
  );
};

export enum MutateTorrentAction {
  Start,
  Remove,
  RemoveAndDeleteLocalData,
  Stop,
  StartAll,
  StopAll,
  Update,
}
export const useMutateTorrent = () => {
  const { mutate } = useSWRConfig();
  const action = useCallback(
    async ({ id, action, data }: { id?: Torrent["id"]; action: MutateTorrentAction; data?: Partial<Torrent> }) => {
      const { torrents } = await transmission.get(false);
      const torrent = torrents.find((t: Torrent) => t.id === id);
      let updated: Torrent | null = { ...torrent, ...data };

      switch (action) {
        case MutateTorrentAction.Start:
          updated = { ...torrent, status: TorrentStatus.Downloading };
          await transmission.start([id]);
          break;
        case MutateTorrentAction.Stop:
          updated = { ...torrent, status: TorrentStatus.Stopped };
          await transmission.stop([id]);
          break;
        case MutateTorrentAction.Remove:
          updated = null;
          await transmission.remove([id]);
          break;
        case MutateTorrentAction.RemoveAndDeleteLocalData:
          updated = null;
          await transmission.remove([id], true);
          break;
        case MutateTorrentAction.StopAll:
          await transmission.stop(false);
          break;
        case MutateTorrentAction.StartAll:
          await transmission.start(false);
          break;
        case MutateTorrentAction.Update:
          if (updated == null) break;
          if (!equals(updated, torrent)) {
            await transmission.set([id], updated);
          }
      }

      if (action !== MutateTorrentAction.StartAll && action !== MutateTorrentAction.StopAll) {
        mutate(`/torrent/${id}`, updated);
        mutate(
          `/torrent`,
          updated != null
            ? torrents.map((t: Torrent) => (t.id === id ? updated : t))
            : torrents.filter((t: Torrent) => t.id !== id),
        );
      } else {
        mutate(
          `/torrent`,
          torrents.map((t: Torrent) => ({
            ...t,
            status: action === MutateTorrentAction.StartAll ? TorrentStatus.Downloading : TorrentStatus.Stopped,
          })),
        );
      }
    },
    [],
  );

  return {
    startAll: useCallback(() => action({ action: MutateTorrentAction.StartAll }), [action]),
    stopAll: useCallback(() => action({ action: MutateTorrentAction.StopAll }), [action]),
    start: useCallback((id: Torrent["id"]) => action({ id, action: MutateTorrentAction.Start }), [action]),
    stop: useCallback((id: Torrent["id"]) => action({ id, action: MutateTorrentAction.Stop }), [action]),
    remove: useCallback((id: Torrent["id"]) => action({ id, action: MutateTorrentAction.Remove }), [action]),
    removeAndDeleteLocalData: useCallback(
      (id: Torrent["id"]) => action({ id, action: MutateTorrentAction.RemoveAndDeleteLocalData }),
      [action],
    ),
    update: useCallback(
      (id: Torrent["id"], data: Partial<Torrent>) => action({ id, action: MutateTorrentAction.Update, data }),
      [action],
    ),
  };
};
export const useAllTorrents = ({ refreshInterval }: { refreshInterval: number } = OPTIONS) => {
  return useSWR<Torrent[]>(
    "/torrent",
    async () => {
      const { torrents } = await transmission.get(false);
      const limited = torrents.map((torrent: Torrent) => {
        torrent.fileStats = [];
        torrent.files = torrent.files.slice(0, 30);
        torrent.trackers = torrent.trackers.slice(0, 30);
        return torrent;
      });
      return limited;
    },
    { refreshInterval },
  );
};

export const useSessionStats = ({ refreshInterval = INTERVAL }: { refreshInterval: number } = OPTIONS) => {
  return useSWR<SessionStats>(
    "/session-stats",
    async () => {
      return transmission.sessionStats();
    },
    { refreshInterval },
  );
};

export const isLocalTransmission = () => {
  return preferences.host === "localhost" || preferences.host === "127.0.0.1";
};
