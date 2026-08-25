import { Action, ActionPanel, Icon, List, open, useNavigation } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { Song } from "../types";
import SongListItem from "./SongItem";
import { useState } from "react";
import { goToRoot, shuffleArray } from "../utils/helpers";
import RefreshAction from "./RefreshAction";
import { getFolders } from "../utils/cache";
import FolderListItem from "./FolderListItem";

interface FolderSongsViewProps {
  folderPath: string;
  songs: Song[];
  onRefresh: () => Promise<Song[]>;
}

export function FolderSongsView({ folderPath, songs, onRefresh }: FolderSongsViewProps) {
  const { push } = useNavigation();

  const filterFolderSongs = (inputSongs: Song[]) =>
    inputSongs.filter((s) => path.dirname(s.path).toLowerCase() === folderPath.toLowerCase());

  const [folders, setFolders] = useState<string[]>(() => getFolders(songs, folderPath));
  const [folderSongs, setFolderSongs] = useState<Song[]>(() => filterFolderSongs(songs));

  const handleRefresh = async () => {
    const refreshedSongs: Song[] = await onRefresh();
    setFolderSongs(filterFolderSongs(refreshedSongs));
    setFolders(getFolders(refreshedSongs, folderPath));
    return refreshedSongs;
  };

  const playAllSongs = async (shuffle = false) => {
    const playlistPath = path.join(os.tmpdir(), `music-list-${Date.now()}.m3u8`);
    const songs = shuffle ? shuffleArray(folderSongs) : folderSongs;

    const playlistContent = ["#EXTM3U", ...songs.map((song) => song.path)].join("\r\n");

    await fs.promises.writeFile(playlistPath, playlistContent, "utf8");
    await open(playlistPath);
    await goToRoot();
  };

  const playRandomSong = async () => {
    if (folderSongs.length === 0) return;
    const randomIndex = Math.floor(Math.random() * folderSongs.length);
    const randomSong = folderSongs[randomIndex];

    await open(randomSong.path);
    await goToRoot();
  };

  return (
    <List navigationTitle={path.basename(folderPath)} searchBarPlaceholder="Search songs...">
      {folderSongs.length > 0 && (
        <List.Section title="Actions">
          <List.Item
            icon={Icon.PlayFilled}
            title="Play All"
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.PlayFilled}
                  title="Play All in Folder"
                  onAction={() => playAllSongs(false)}
                />
                <Action
                  icon={Icon.Shuffle}
                  title="Shuffle & Play All in Folder"
                  onAction={() => playAllSongs(true)}
                />
                <RefreshAction onRefresh={handleRefresh} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.QuestionMark}
            title="Play Random"
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.QuestionMark}
                  title="Play Random Song in Folder"
                  onAction={playRandomSong}
                />
                <RefreshAction onRefresh={handleRefresh} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {folders.length > 0 && (
        <List.Section title="Folders">
          {folders.map((folder) => (
            <FolderListItem
              key={folder}
              folder={folder}
              rootFolder={folderPath}
              onOpen={() =>
                push(
                  <FolderSongsView folderPath={folder} songs={songs} onRefresh={handleRefresh} />
                )
              }
              onRefresh={handleRefresh}
            />
          ))}
        </List.Section>
      )}
      <List.Section
        title={`Songs - ${folderSongs.length} song${folderSongs.length === 1 ? "" : "s"}`}
      >
        {folderSongs.map((song) => (
          <SongListItem
            key={song.path}
            song={song}
            openFolderTarget={folderPath}
            onRefresh={handleRefresh}
          />
        ))}
      </List.Section>
    </List>
  );
}
