import { List, getPreferenceValues, useNavigation } from "@raycast/api";
import path from "path";
import { useEffect, useState } from "react";
import { Song, Preferences } from "./types";
import { getCacheKey, readCache, writeCache, getFolders } from "./utils/cache";
import { getMusicFolder, parseExtensions, loadAllSongs } from "./utils/helpers";
import { FolderSongsView } from "./components/FolderSongsView";
import SongListItem from "./components/SongItem";
import FolderListItem from "./components/FolderListItem";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const musicFolder = getMusicFolder(preferences.musicFolder);
  const exts = parseExtensions(preferences.audioExtensions);
  const cacheKey = getCacheKey(musicFolder, preferences.audioExtensions);

  const [songs, setSongs] = useState<Song[]>(() => readCache(cacheKey).songs);
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const refresh = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const fresh = await loadAllSongs(musicFolder, exts);
      setSongs(fresh);
      writeCache(cacheKey, fresh);
      return fresh;
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = readCache(cacheKey);
    setSongs(cached.songs);
    if (cached.songs.length === 0) void refresh(true);
    else setIsLoading(false);
  }, [cacheKey]);

  const folders = getFolders(songs, musicFolder);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search folders and songs...">
      {folders.length > 0 && (
        <List.Section title="Folders">
          {folders.map((folder) => (
            <FolderListItem
              key={folder}
              folder={folder}
              rootFolder={musicFolder}
              onOpen={() =>
                push(
                  <FolderSongsView
                    folderPath={folder}
                    songs={songs}
                    onRefresh={() => refresh(true)}
                  />
                )
              }
              onRefresh={() => refresh(true)}
            />
          ))}
        </List.Section>
      )}
      <List.Section title={`All Songs - ${songs.length} song${songs.length === 1 ? "" : "s"}`}>
        {songs.map((song) => (
          <SongListItem
            key={song.path}
            song={song}
            openFolderTarget={path.dirname(song.path)}
            extraKeywords={[path.basename(path.dirname(song.path))]}
            onRefresh={() => refresh(true)}
          />
        ))}
      </List.Section>
    </List>
  );
}
