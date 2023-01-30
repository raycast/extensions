import { getPreferenceValues, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { FluentClient } from "./FluentClient";
import { Announcement, OnFavouriteTracksUpdateAction, Preferences, Service, Track } from "./types/common";
import { TrackItem } from "./TrackItem";
import { showError, sortByMaintenance, sortByName } from "./utils";
import { AnnouncementItem } from "./AnnouncementItem";

interface TrackListProps {
  service: Service;
  favouriteTracks: Track[];
  onFavouriteTracksUpdate: OnFavouriteTracksUpdateAction;
}

export default function TrackList({ service, favouriteTracks, onFavouriteTracksUpdate }: TrackListProps) {
  const [ready, setReady] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    const fluent = new FluentClient(service);
    fluent
      .getTracks()
      .then((tracks) => {
        // Sort tracks and store
        if (preferences.sortBy === "name") {
          tracks.sort(sortByName);
        }
        if (preferences.sortBy === "maintenance") {
          tracks.sort(sortByMaintenance);
        }

        setTracks(tracks);
        return fluent.getAnnouncements();
      })
      .then((annoucements) => {
        setAnnouncements(annoucements);
      })
      .catch(() => {
        return showError({
          message: "Error while getting the track info",
        });
      })
      .finally(() => setReady(true));
  }, []);

  return (
    <List isLoading={!ready}>
      <List.Section title="Announcements">
        {announcements?.map((announcement) => {
          return <AnnouncementItem key={announcement.id} announcement={announcement} />;
        })}
      </List.Section>
      <List.Section title="All tracks by services">
        {tracks.map((track, index) => (
          <TrackItem
            isFavourite={Boolean(favouriteTracks.find((favouriteTrack) => favouriteTrack.id === track.id))}
            onFavouriteTracksUpdate={onFavouriteTracksUpdate}
            key={index}
            track={track}
          />
        ))}
      </List.Section>
    </List>
  );
}
