import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { FluentClient } from "./FluentClient";
import { getFavouriteTracksStorage } from "./Storage";
import { TrackItem } from "./TrackItem";
import TrackList from "./TrackList";
import { Service, Track } from "./types/common";
import { getServiceFromTrack, showError } from "./utils";

export default function ServiceList({ services }: { services: Service[] }) {
  const [ready, setReady] = useState(false);
  const favouriteStorage = getFavouriteTracksStorage();
  const [favouriteTracks, setFavouriteTracks] = useState<Track[]>();

  const updateFavouriteTracks = () => {
    favouriteStorage
      .getAll()
      .then((favouriteBaseTracks) => {
        // Fetch maintenance for favourite tracks
        return Promise.all(
          favouriteBaseTracks.map(async (favouriteBaseTrack) => {
            // Fetch track info from specific service
            const favouriteTrackService = services.find((service) => service.id === favouriteBaseTrack.serviceId);

            if (!favouriteTrackService) {
              await showError({
                title: "Failure",
                message: "Failed to find track",
              });
              return {
                ...favouriteBaseTrack,
                maintenanceDate: new Date(0),
                status: "closed",
              } as Track;
            }

            // Fetch maintenance info
            const fluent = new FluentClient(favouriteTrackService);
            const updatedTracks = await fluent.getTracks();
            const updatedTrack = updatedTracks.find((updatedTrack) => updatedTrack.id === favouriteBaseTrack.id);

            if (!updatedTrack) {
              await showError({
                message: "Failed to find track maintenance info",
              });
              return {
                ...favouriteBaseTrack,
                maintenanceDate: new Date(0),
                status: "closed",
              } as Track;
            }

            // Build favourite track with updated maintenance info
            const service = await getServiceFromTrack(updatedTrack, services);
            const favouriteTrack: Track = {
              ...favouriteBaseTrack,
              service,
              maintenanceDate: updatedTrack.maintenanceDate,
              status: updatedTrack.status,
            } as Track;

            return favouriteTrack;
          })
        );
      })
      .then((favouriteTracks) => {
        return favouriteTracks && setFavouriteTracks(favouriteTracks);
      })
      .catch(() => {
        return showError({
          message: "Failed to retrieve service",
        });
      });
  };

  // Update on initial load
  useEffect(() => {
    updateFavouriteTracks();
  }, []);

  // Set ready flag
  useEffect(() => {
    const favouritesTracksLoaded = favouriteTracks !== undefined;
    const servicesLoaded = services !== undefined;
    setReady(favouritesTracksLoaded && servicesLoaded);
  }, [favouriteTracks, services]);

  return (
    <List isLoading={!ready}>
      <List.Section title="Favourites">
        {ready &&
          favouriteTracks?.map((favouriteTrack) => {
            return (
              <TrackItem
                isFavourite={true}
                key={favouriteTrack.id}
                track={favouriteTrack}
                onFavouriteTracksUpdate={() => updateFavouriteTracks()}
              />
            );
          })}
      </List.Section>
      <List.Section title="All tracks by services">
        {ready &&
          services.map((service, index) => {
            return (
              <List.Item
                key={index}
                icon={{ source: Icon.House }}
                title={service.name}
                subtitle={service.country}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Details"
                      icon={Icon.MagnifyingGlass}
                      target={
                        <TrackList
                          service={service}
                          favouriteTracks={favouriteTracks || []}
                          onFavouriteTracksUpdate={updateFavouriteTracks}
                        />
                      }
                    />
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}
