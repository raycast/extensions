import { List, ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchChapters, fetchAudioFile, fetchRecitations } from "./lib/api";
import { playAudio } from "./lib/audio";
import { Chapter, Recitation, Preferences } from "./types";
import { useState, useEffect } from "react";

export default function Command() {
  const { data: chapters, isLoading } = useCachedPromise(fetchChapters);
  const preferences = getPreferenceValues<Preferences>();
  const [defaultReciter, setDefaultReciter] = useState<{ id: number; name: string }>({
    id: parseInt(preferences.defaultReciterId || "2"),
    name: preferences.defaultReciterName || "AbdulBaset AbdulSamad (Murattal)",
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

      // Store currently playing info for the menu bar
      await LocalStorage.setItem(
        "currently_playing",
        JSON.stringify({
          surah: chapter.name_simple,
          reciter: rname,
          chapterId: chapter.id,
          reciterId: rid,
          startTime: Date.now(),
        }),
      );

      await playAudio(audioFile.audio_url);

      toast.style = Toast.Style.Success;
      toast.title = `Playing ${chapter.name_simple}`;
      toast.message = `Reciter: ${rname}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to play audio";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Surahs...">
      {chapters?.map((chapter: Chapter) => (
        <List.Item
          key={chapter.id}
          title={`${chapter.id}. ${chapter.name_simple}`}
          subtitle={`${chapter.translated_name.name} • ${chapter.verses_count} verses`}
          accessoryTitle={chapter.revelation_place}
          icon={Icon.Book}
          actions={
            <ActionPanel>
              <Action
                title={`Play with ${defaultReciter.name}`}
                icon={Icon.Play}
                onAction={() => handlePlay(chapter)}
              />
              <Action.Push
                title="Choose Reciter"
                icon={Icon.Person}
                target={<ReciterPicker chapter={chapter} onSelect={(r) => handlePlay(chapter, r.id, r.reciter_name)} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ReciterPicker({ chapter, onSelect }: { chapter: Chapter; onSelect: (recitation: Recitation) => void }) {
  const { data: recitations, isLoading } = useCachedPromise(fetchRecitations);

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Choose reciter for Surah ${chapter.name_simple}...`}>
      {recitations?.map((recitation: Recitation) => (
        <List.Item
          key={recitation.id}
          title={recitation.reciter_name}
          subtitle={recitation.style}
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <Action title="Select Reciter" icon={Icon.Checkmark} onAction={() => onSelect(recitation)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
