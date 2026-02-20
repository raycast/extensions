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
  LaunchProps,
  popToRoot,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchChapters, fetchAudioFile, fetchRecitations, fetchVerseRecitations } from "./lib/api";
import { playAudio, playVersePlaylist } from "./lib/audio";
import { Chapter, Recitation, Preferences } from "./types";
import { useState, useEffect, useMemo, useCallback } from "react";
import MemorizeSurah from "./memorize-surah";
import { FAV_SURAH_KEY, FAV_RECITER_KEY, SURAH_VERSE_COUNTS } from "./lib/constants";

export default function Command(props: LaunchProps<{ arguments: { surah?: string; start?: string; end?: string } }>) {
  const {
    data: chapters,
    isLoading: isChaptersLoading,
  } = useCachedPromise(fetchChapters);

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

  const handlePlayAction = useCallback(
    async (chapter: Chapter, reciterId?: number, reciterName?: string, startAyah?: number, endAyah?: number) => {
      const rid = reciterId || defaultReciter.id;
      const rname = reciterName || defaultReciter.name;

      const title = startAyah ? `Surah ${chapter.name_simple} • ${startAyah}${endAyah ? `-${endAyah}` : ""}` : `Surah ${chapter.name_simple}`;

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching audio...",
        message: `${title} (${rname})`,
      });

      try {
        let duration = 0;

        if (startAyah) {
          const allRecitations = await fetchVerseRecitations(rid, chapter.id);
          const end = endAyah || startAyah;
          const rangeRecitations = allRecitations.filter((r) => {
            const vNum = parseInt(r.verse_key.split(":")[1]);
            return vNum >= startAyah && vNum <= end;
          });

          const verseItems = rangeRecitations.map((r) => ({ url: r.url, verseKey: r.verse_key }));
          if (verseItems.length === 0) throw new Error("No verses found for this range.");

          duration = await playVersePlaylist(verseItems, rname, 1);

          await LocalStorage.setItem(
            "currently_playing",
            JSON.stringify({
              surah: title,
              reciter: rname,
              chapterId: chapter.id,
              startTime: Date.now(),
              duration,
            }),
          );
        } else {
          const audioFile = await fetchAudioFile(rid, chapter.id);
          duration = await playAudio(audioFile.audio_url, rname, chapter.name_simple);

          await LocalStorage.setItem(
            "currently_playing",
            JSON.stringify({
              surah: chapter.name_simple,
              reciter: rname,
              chapterId: chapter.id,
              reciterId: rid,
              startTime: Date.now(),
              duration,
            }),
          );
        }

        await launchCommand({ name: "status", type: LaunchType.UserInitiated });

        toast.style = Toast.Style.Success;
        toast.title = `Playing ${chapter.name_simple}`;
        toast.message = `Reciter: ${rname}`;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to play audio";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    [defaultReciter],
  );

  useEffect(() => {
    async function handleArguments() {
      if (!isChaptersLoading && chapters && props.arguments.surah) {
        if (props.arguments.surah === "") return;
        const query = props.arguments.surah.toLowerCase().trim();
        const chapter = chapters.find(
          (c) =>
            c.id.toString() === query ||
            c.name_simple.toLowerCase().includes(query) ||
            c.name_complex.toLowerCase().includes(query),
        );

        if (chapter) {
          const maxVerses = SURAH_VERSE_COUNTS[chapter.id] || 0;
          const start = props.arguments.start ? parseInt(props.arguments.start) : undefined;
          const end = props.arguments.end ? parseInt(props.arguments.end) : undefined;

          // Validation
          if (start !== undefined && (isNaN(start) || start < 1 || start > maxVerses)) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Invalid Start Ayah",
              message: `Surah ${chapter.name_simple} only has ${maxVerses} verses.`,
            });
            return;
          }

          if (end !== undefined && (isNaN(end) || end < 1 || end > maxVerses || (start && end < start))) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Invalid End Ayah",
              message: end < (start || 1)
                ? "End Ayah cannot be before Start Ayah."
                : `Surah ${chapter.name_simple} only has ${maxVerses} verses.`,
            });
            return;
          }

          await handlePlayAction(chapter, undefined, undefined, start, end);
          await popToRoot();
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Surah not found",
            message: `Could not find "${props.arguments.surah}"`,
          });
        }
      }
    }
    handleArguments();
  }, [isChaptersLoading, chapters, props.arguments.surah, props.arguments.start, props.arguments.end, handlePlayAction]);

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
                  onAction={() => handlePlayAction(chapter)}
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
                    <ReciterPicker chapter={chapter} onSelect={(r) => handlePlayAction(chapter, r.id, r.reciter_name)} />
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
