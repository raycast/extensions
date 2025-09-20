import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { FavoriteAyah } from "./types";
import { getFavoriteAyahs, removeAyahFromFavorites } from "./utils";

export default function Command() {
  const [favorites, setFavorites] = useState<FavoriteAyah[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const favorites = await getFavoriteAyahs();
      setFavorites(favorites);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const removeAyah = async (ayah: FavoriteAyah) => {
    await removeAyahFromFavorites(ayah);
    const favorites = await getFavoriteAyahs();
    setFavorites(favorites);
  };

  return (
    <List isLoading={isLoading} isShowingDetail>
      {favorites.map((favorite) => (
        <List.Item
          key={`${favorite.surahNumber}-${favorite.ayahNumber}`}
          title={favorite.surah}
          subtitle={favorite.ayahNumber.toString()}
          icon={{ source: "quran_logo.png" }}
          detail={<List.Item.Detail markdown={`### ${favorite.text}`} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Ayah"
                content={`${favorite.text}\n\n${favorite.surah} ${favorite.surahNumber}:${favorite.ayahNumber}`}
              />
              <Action.OpenInBrowser
                url={`https://quran.com/${favorite.surahNumber}/${favorite.ayahNumber}`}
                title="Read In Browser"
              />
              <Action
                title="Remove From Favorites"
                icon={{ source: Icon.XMarkCircle }}
                onAction={async () => await removeAyah(favorite)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
