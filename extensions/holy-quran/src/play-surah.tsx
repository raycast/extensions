import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  Color,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchChapters, fetchAudioFile, fetchRecitations } from "./lib/api";
import { playAudio } from "./lib/audio";
import { Chapter, Recitation, Preferences } from "./types";
import { useState, useEffect, useMemo } from "react";
import MemorizeSurah from "./memorize-surah";
import { FAV_SURAH_KEY, FAV_RECITER_KEY } from "./lib/constants";

export default function Command() {
  const { data: chapters, isLoading: isChaptersLoading } = useCachedPromise(fetchChapters);
  const {
    data: favorites,
    isLoading: isFavsLoading,
    mutate: mutateFavs,
  } = useCachedPromise(async () => {
    const favs = await LocalStorage.getItem<string>(FAV_SURAH_KEY);
    return favs ? (JSON.parse(favs) as number[]) : [];
  });

  const preferences = getPreferenceValues<Preferences>();
  const [defaultReciter, setDefaultReciter] = useState<{ id: number; name: string }>({
    id: parseInt(preferences.defaultReciterId || "7"),
    name: preferences.defaultReciterName || "Mishari Rashid al-`Afasy",
  });

  useEffect(() => {
    async function loadDefaultReciter() {
      const id = await LocalStorage.getItem<string>("defaultReciterId");
      const name = await LocalStorage.getItem<string>("defaultReciterName");
      if (id && name) {
        setDefaultReciter({ id: parseInt(id), name });
      }
    }
    loadDefaultReciter();
  }, []);

  const isLoading = isChaptersLoading || isFavsLoading;

  const sortedChapters = useMemo(() => {
    if (!chapters) return [];
    if (!favorites) return chapters;

    return [...chapters].sort((a, b) => {
      const aIsFav = favorites.includes(a.id);
      const bIsFav = favorites.includes(b.id);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
      return a.id - b.id;
    });
  }, [chapters, favorites]);

  async function handlePlay(chapter: Chapter, reciterId?: number, reciterName?: string) {
    const rid = reciterId || defaultReciter.id;
    const rname = reciterName || defaultReciter.name;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching audio...",
      message: `Surah ${chapter.name_simple} (${rname})`,
    });

    try {
      const audioFile = await fetchAudioFile(rid, chapter.id);
      const duration = await playAudio(audioFile.audio_url, rname, chapter.name_simple);

      // Store currently playing info for the menu bar
      await LocalStorage.setItem(
        "currently_playing",
        JSON.stringify({
          surah: chapter.name_simple,
          reciter: rname,
          chapterId: chapter.id,
          reciterId: rid,
          startTime: Date.now(),
          duration: duration,
        }),
      );

      // Refresh Menu Bar status immediately
      await launchCommand({ name: "status", type: LaunchType.UserInitiated });

      toast.style = Toast.Style.Success;
      toast.title = `Playing ${chapter.name_simple}`;
      toast.message = `Reciter: ${rname}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to play audio";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function toggleFavorite(chapterId: number) {
    if (!favorites) return;
    const newFavs = favorites.includes(chapterId)
      ? favorites.filter((id: number) => id !== chapterId)
      : [...favorites, chapterId];

    await LocalStorage.setItem(FAV_SURAH_KEY, JSON.stringify(newFavs));
    await mutateFavs(Promise.resolve(newFavs));
    await showToast({
      title: favorites.includes(chapterId) ? "Removed from Favorites" : "Added to Favorites",
      style: Toast.Style.Success,
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Surahs...">
      {sortedChapters.map((chapter: Chapter) => {
        const isFavorite = favorites?.includes(chapter.id);
        const place = chapter.revelation_place.toLowerCase();

        const revelationIcon =
          place === "makkah"
            ? { light: "icons/Meccan.png", dark: "icons/Meccan@dark.png" }
            : { light: "icons/Medinan.png", dark: "icons/Medinan@dark.png" };
        const revelationPlace = place === "makkah" ? "Makkah" : "Madina";

        const accessories: List.Item.Accessory[] = [];

        // Add Favorite Star
        if (isFavorite) {
          accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
        }

        // Add Arabic Name
        if (chapter.name_arabic) {
          accessories.push({ tag: { value: chapter.name_arabic, color: Color.SecondaryText } });
        }

        // Add Verse Count
        accessories.push({
          icon: Icon.Book,
          text: `${chapter.verses_count}`,
        });

        // Add Revelation Place
        accessories.push({
          icon: { source: revelationIcon },
          text: `${revelationPlace}`,
        });

        return (
          <List.Item
            key={chapter.id}
            title={`${chapter.id}. ${chapter.name_simple}`}
            subtitle={"⸱  " + chapter.translated_name.name}
            icon={{ source: "icons/quran-icon.svg", tintColor: isFavorite ? Color.Yellow : undefined }}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title={`Play with ${defaultReciter.name}`}
                  icon={Icon.Play}
                  onAction={() => handlePlay(chapter)}
                />
                <Action.Push
                  title="Memorization Mode (Loop)"
                  icon={Icon.Repeat}
                  target={<MemorizeSurah chapter={chapter} />}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                />
                <Action
                  title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  onAction={() => toggleFavorite(chapter.id)}
                />
                <Action.Push
                  title="Choose Reciter"
                  icon={Icon.Person}
                  target={
                    <ReciterPicker chapter={chapter} onSelect={(r) => handlePlay(chapter, r.id, r.reciter_name)} />
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function ReciterPicker({ chapter, onSelect }: { chapter: Chapter; onSelect: (recitation: Recitation) => void }) {
  const { data: recitations, isLoading: isRecitationsLoading } = useCachedPromise(fetchRecitations);
  const {
    data: favorites,
    isLoading: isFavsLoading,
    mutate: mutateFavs,
  } = useCachedPromise(async () => {
    const favs = await LocalStorage.getItem<string>(FAV_RECITER_KEY);
    return favs ? (JSON.parse(favs) as number[]) : [];
  });

  const isLoading = isRecitationsLoading || isFavsLoading;

  const sortedRecitations = useMemo(() => {
    if (!recitations) return [];
    if (!favorites) return recitations;

    return [...recitations].sort((a, b) => {
      const aIsFav = favorites.includes(a.id);
      const bIsFav = favorites.includes(b.id);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
      return a.reciter_name.localeCompare(b.reciter_name);
    });
  }, [recitations, favorites]);

  async function toggleFavorite(reciterId: number) {
    if (!favorites) return;
    const newFavs = favorites.includes(reciterId)
      ? favorites.filter((id: number) => id !== reciterId)
      : [...favorites, reciterId];

    await LocalStorage.setItem(FAV_RECITER_KEY, JSON.stringify(newFavs));
    await mutateFavs(Promise.resolve(newFavs));
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Choose reciter for Surah ${chapter.name_simple}...`}>
      {sortedRecitations.map((recitation: Recitation) => {
        const isFavorite = favorites?.includes(recitation.id);
        return (
          <List.Item
            key={recitation.id}
            title={recitation.reciter_name}
            subtitle={recitation.style}
            icon={{ source: Icon.Person, tintColor: isFavorite ? Color.Yellow : undefined }}
            accessories={isFavorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []}
            actions={
              <ActionPanel>
                <Action title="Select Reciter" icon={Icon.Checkmark} onAction={() => onSelect(recitation)} />
                <Action
                  title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  onAction={() => toggleFavorite(recitation.id)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
