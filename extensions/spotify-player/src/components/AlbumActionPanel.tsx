import React, { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, popToRoot, showHUD } from "@raycast/api";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { TracksList } from "./TracksList";
import { getErrorMessage } from "../helpers/getError";
import { addToMySavedAlbums } from "../api/addToMySavedAlbums";
import { removeFromMySavedAlbums } from "../api/removeFromMySavedAlbums";
import { getMySavedAlbums } from "../api/getMySavedAlbums";

type AlbumActionPanelProps = { album: SimplifiedAlbumObject };

export function AlbumActionPanel({ album }: AlbumActionPanelProps) {
  const [isAlbumSaved, setIsAlbumSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkIfAlbumSaved() {
      try {
        const { items: savedAlbums } = await getMySavedAlbums();
        const isSaved = savedAlbums.some((savedAlbum) => savedAlbum.id === album.id);
        setIsAlbumSaved(isSaved);
      } catch (error) {
        await showHUD(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    checkIfAlbumSaved().then();
  }, [album.id]);

  if (isLoading) {
    return (
      <ActionPanel title="Loading...">
        <Action title="Loading..." />
      </ActionPanel>
    );
  }

  return (
    <ActionPanel>
      <PlayAction id={album.id} type="album" />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Songs"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<TracksList album={album} showGoToAlbum={false} />}
      />
      {!isAlbumSaved && (
        <Action
          icon={Icon.Plus}
          title="Add To Library"
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={async () => {
            try {
              await addToMySavedAlbums({ albumIds: [album.id] });
              await showHUD("Album added to the library");
              setIsAlbumSaved(true);
              await popToRoot();
              return;
            } catch (err) {
              const error = getErrorMessage(err);
              await showHUD(error);
            }
          }}
        />
      )}
      {isAlbumSaved && (
        <Action
          icon={Icon.Minus}
          title="Remove From Library"
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={async () => {
            try {
              await removeFromMySavedAlbums({ albumIds: [album.id] });
              await showHUD("Album removed from the library");
              setIsAlbumSaved(false);
              await popToRoot();
              return;
            } catch (err) {
              const error = getErrorMessage(err);
              await showHUD(error);
            }
          }}
        />
      )}
      <FooterAction url={album?.external_urls?.spotify} uri={album.uri} title={album.name} />
    </ActionPanel>
  );
}
