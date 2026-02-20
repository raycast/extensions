import { List, ActionPanel, Action, Icon, showToast, Toast, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchVerses, fetchVerseRecitations } from "./lib/api";
import { playVersePlaylist } from "./lib/audio";
import { Chapter, Preferences } from "./types";

export default function MemorizeSurah({ chapter }: { chapter: Chapter }) {
  const { data: verses, isLoading } = useCachedPromise(() => fetchVerses(chapter.id));
  const preferences = getPreferenceValues<Preferences>();

  const [startAyah, setStartAyah] = useState<number>(1);
  const [endAyah, setEndAyah] = useState<number>(1);
  const [repeatCount, setRepeatCount] = useState<number>(1);
  const [isDownloading, setIsDownloading] = useState(false);

  // Initialize endAyah when verses are loaded
  useEffect(() => {
    if (verses && verses.length > 0) {
      setEndAyah(verses.length > 5 ? 5 : verses.length);
    }
  }, [verses]);

  const reciterId = parseInt(preferences.defaultReciterId || "2");
  const reciterName = preferences.defaultReciterName || "AbdulBaset AbdulSamad";

  async function handleStartLoop() {
    if (startAyah > endAyah) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Range",
        message: "Start ayah must be before or equal to end ayah.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Preparing playlist...",
      message: `Looping verses ${startAyah} to ${endAyah} (${repeatCount}x)`,
    });

    setIsDownloading(true);
    try {
      const allRecitations = await fetchVerseRecitations(reciterId, chapter.id);

      // Filter for the selected range
      const rangeRecitations = allRecitations.filter((r) => {
        const verseNum = parseInt(r.verse_key.split(":")[1]);
        return verseNum >= startAyah && verseNum <= endAyah;
      });

      const urls = rangeRecitations.map((r) => r.url);

      if (urls.length === 0) throw new Error("No audio files found for this range.");

      // Store in LocalStorage for the Menu Bar
      await LocalStorage.setItem(
        "currently_playing",
        JSON.stringify({
          surah: `${chapter.name_simple} (${startAyah}-${endAyah})`,
          reciter: reciterName,
          chapterId: chapter.id,
          startTime: Date.now(),
          isMemorization: true,
        }),
      );

      await playVersePlaylist(urls, repeatCount);

      toast.style = Toast.Style.Success;
      toast.title = "Loop started";
      toast.message = `Surah ${chapter.name_simple} • Verses ${startAyah}-${endAyah}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start loop";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <List
      isLoading={isLoading || isDownloading}
      searchBarPlaceholder="Select range and repeats..."
      navigationTitle={`Memorize: Surah ${chapter.name_simple}`}
    >
      <List.Section title={`Range: ${startAyah} - ${endAyah} | Repeats: ${repeatCount === 0 ? "∞" : repeatCount}`}>
        <List.Item
          title="▶ Start Loop Playback"
          icon={Icon.PlayFilled}
          actions={
            <ActionPanel>
              <Action title="Start Loop" onAction={handleStartLoop} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Configure Repeats">
        {[1, 2, 3, 5, 10, 0].map((count) => (
          <List.Item
            key={count}
            title={`${count === 0 ? "Infinite" : count} Times`}
            icon={repeatCount === count ? Icon.Checkmark : Icon.Circle}
            actions={
              <ActionPanel>
                <Action title="Select Repeats" onAction={() => setRepeatCount(count)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Select Range (Ayahs)">
        {verses?.map((verse) => (
          <List.Item
            key={verse.id}
            title={`${verse.verse_number}. ${verse.text_uthmani}`}
            accessoryTitle={verse.verse_number === startAyah ? "START" : verse.verse_number === endAyah ? "END" : ""}
            icon={Icon.Text}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Start Ayah"
                  onAction={() => setStartAyah(verse.verse_number)}
                  icon={Icon.ChevronUp}
                />
                <Action
                  title="Set as End Ayah"
                  onAction={() => setEndAyah(verse.verse_number)}
                  icon={Icon.ChevronDown}
                />
                <Action
                  title="Set as Both Start & End"
                  onAction={() => {
                    setStartAyah(verse.verse_number);
                    setEndAyah(verse.verse_number);
                  }}
                  icon={Icon.Checkmark}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
