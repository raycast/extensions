import React from "react";
import { Action, ActionPanel, Icon, popToRoot, showHUD } from "@raycast/api";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { TracksList } from "./TracksList";
import { getErrorMessage } from "../helpers/getError";
import { addToMySavedAlbums } from "../api/addToMySavedAlbums";
import { removeFromMySavedAlbums } from "../api/removeFromMySavedAlbums";
import { useContainsMySavedAlbum } from "../hooks/useContainsMySavedAlbum";

type AlbumActionPanelProps = { album: SimplifiedAlbumObject };

export function AlbumActionPanel({ album }: AlbumActionPanelProps) {
  const { data: isAlbumSaved, mutate } = useContainsMySavedAlbum({ albumId: album.id });

  return (
    <ActionPanel>
      <PlayAction id={album.id} type="album" />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Songs"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<TracksList album={album} showGoToAlbum={false} />}
      />
      <Action
        icon={isAlbumSaved ? Icon.Minus : Icon.Plus}
        title={isAlbumSaved ? "Remove From Library" : "Add To Library"}
        shortcut={{ modifiers: ["cmd", "shift"], key: isAlbumSaved ? "d" : "s" }}
        onAction={async () => {
          try {
            if (isAlbumSaved) {
              await removeFromMySavedAlbums({ albumIds: [album.id] });
            } else {
              await addToMySavedAlbums({ albumIds: [album.id] });
            }
            await mutate();
            await showHUD(isAlbumSaved ? "Album removed from the library" : "Album added to the library");
            await popToRoot();
            return;
          } catch (err) {
            const error = getErrorMessage(err);
            await showHUD(error);
          }
        }}
      />
      <FooterAction url={album?.external_urls?.spotify} uri={album.uri} title={album.name} />
    </ActionPanel>
  );
}
