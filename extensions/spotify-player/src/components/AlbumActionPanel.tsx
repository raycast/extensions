import React from "react";
import { Action, ActionPanel, Icon, popToRoot, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { AlbumTracksList } from "./AlbumTracksList";
import { getErrorMessage } from "../helpers/getError";
import { useYourLibrary } from "../hooks/useYourLibrary";

type AlbumActionPanelProps = { album: SimplifiedAlbumObject };

export function AlbumActionPanel({ album }: AlbumActionPanelProps) {
  const library = useYourLibrary();
  const { data: isAlbumSaved, mutate } = useCachedPromise(
    (albumId: string) => library.containsSavedAlbum(albumId),
    [album.id],
  );

  return (
    <ActionPanel>
      <PlayAction id={album.id} type="album" />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Songs"
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "a" },
          Windows: { modifiers: ["ctrl", "shift"], key: "a" },
        }}
        target={<AlbumTracksList album={album} showGoToAlbum={false} />}
      />
      <Action
        icon={isAlbumSaved ? Icon.Minus : Icon.Plus}
        title={isAlbumSaved ? "Remove from Library" : "Add to Library"}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: isAlbumSaved ? "d" : "s" },
          Windows: { modifiers: ["ctrl", "shift"], key: isAlbumSaved ? "d" : "s" },
        }}
        onAction={async () => {
          try {
            if (isAlbumSaved) {
              await library.removeSavedAlbum(album.id);
            } else {
              await library.addSavedAlbum(album);
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
