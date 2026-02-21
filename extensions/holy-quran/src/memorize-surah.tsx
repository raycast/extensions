import {
  Form,
  ActionPanel,
  Action,
  getPreferenceValues,
  LocalStorage,
  launchCommand,
  LaunchType,
  useNavigation,
  showHUD,
} from "@raycast/api";
import { useCachedPromise, useForm, FormValidation } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchChapters, fetchVerseRecitations, fetchRecitations } from "./lib/api";
import { playVersePlaylist } from "./lib/audio";
import { Chapter, Preferences } from "./types";
import { SURAH_VERSE_COUNTS } from "./lib/constants";

interface MemorizeFormValues {
  chapterId: string;
  startAyah: string;
  endAyah: string;
  reciterId: string;
  isInfinite: boolean;
  repeatCount: string;
}

export default function MemorizeSurah(props: { chapter?: Chapter }) {
  const { pop } = useNavigation();
  const { data: chapters } = useCachedPromise(fetchChapters);
  const { data: recitations } = useCachedPromise(fetchRecitations);
  const preferences = getPreferenceValues<Preferences>();

  const [selectedChapterId, setSelectedChapterId] = useState<number | undefined>(props.chapter?.id);
  const [maxVerses, setMaxVerses] = useState<number>(props.chapter?.verses_count || 0);

  useEffect(() => {
    if (selectedChapterId) {
      setMaxVerses(SURAH_VERSE_COUNTS[selectedChapterId] || 0);
    }
  }, [selectedChapterId]);

  const { handleSubmit, itemProps, values, setValue } = useForm<MemorizeFormValues>({
    async onSubmit(values) {
      const chapterId = parseInt(values.chapterId);
      const startNum = parseInt(values.startAyah);
      const endNum = values.endAyah ? parseInt(values.endAyah) : startNum;
      const reciterId = parseInt(values.reciterId);
      const repeats = values.isInfinite ? 0 : parseInt(values.repeatCount);

      const chapter = chapters?.find((c) => c.id === chapterId);
      const reciter = recitations?.find((r) => r.id === reciterId);
      if (!chapter || !reciter) return;

      const rname = reciter.reciter_name;

      try {
        await showHUD(`Preparing ${chapter.name_simple} ${startNum}-${endNum}...`);

        const allRecitations = await fetchVerseRecitations(reciterId, chapterId);
        const rangeRecitations = allRecitations.filter((r) => {
          const verseNum = parseInt(r.verse_key.split(":")[1]);
          return verseNum >= startNum && verseNum <= endNum;
        });

        const verseItems = rangeRecitations.map((r) => ({ url: r.url, verseKey: r.verse_key }));
        if (verseItems.length === 0) throw new Error("No verses found for this range.");

        const finalDuration = await playVersePlaylist(verseItems, rname, repeats);

        await LocalStorage.setItem(
          "currently_playing",
          JSON.stringify({
            surah: `${chapter.name_simple} (${startNum}-${endNum})`,
            reciter: rname,
            chapterId: chapter.id,
            startTime: Date.now(),
            isMemorization: true,
            duration: finalDuration,
            isRepeating: values.isInfinite || parseInt(values.repeatCount) > 1,
          })
        );

        await launchCommand({ name: "status", type: LaunchType.UserInitiated });
        await showHUD(values.isInfinite ? "Infinite loop started" : "Recitation started");
        pop();
      } catch (error) {
        await showHUD("Failed to start playback");
      }
    },
    validation: {
      chapterId: FormValidation.Required,
      startAyah: (value) => {
        const n = parseInt(value || "");
        if (isNaN(n) || n < 1 || n > maxVerses) return `Must be 1-${maxVerses}`;
      },
      endAyah: (value) => {
        if (!value) return; // Optional, defaults to start
        const n = parseInt(value);
        if (isNaN(n) || n < 1 || n > maxVerses) return `Must be 1-${maxVerses}`;
        if (parseInt(values.startAyah) > n) return "Cannot be before start";
      },
      reciterId: FormValidation.Required,
    },
    initialValues: {
      chapterId: props.chapter?.id.toString() || "1",
      startAyah: "1",
      endAyah: "",
      reciterId: preferences.defaultReciterId || "7",
      isInfinite: true,
      repeatCount: "5",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Recitation" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Select a specific range and repetition behavior for your study." />

      <Form.Dropdown
        {...itemProps.chapterId}
        title="Surah"
        onChange={(val) => {
          setSelectedChapterId(parseInt(val));
          setValue("chapterId", val);
          const newMax = SURAH_VERSE_COUNTS[parseInt(val)] || 0;
          if (parseInt(values.endAyah) > newMax) {
            setValue("endAyah", newMax.toString());
          }
        }}
      >
        {chapters?.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id.toString()} title={`${c.id}. ${c.name_simple} (${c.verses_count} Ayahs)`} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        {...itemProps.startAyah}
        title="Start Ayah"
        placeholder="1"
      />

      <Form.TextField
        {...itemProps.endAyah}
        title="End Ayah"
        placeholder="Same as start"
      />

      <Form.Dropdown {...itemProps.reciterId} title="Reciter">
        {recitations?.map((r) => (
          <Form.Dropdown.Item
            key={r.id}
            value={r.id.toString()}
            title={r.reciter_name + (r.style && r.style !== "null" ? ` (${r.style})` : "")}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Checkbox {...itemProps.isInfinite} label="Loop Infinitely" />

      {!values.isInfinite && (
        <Form.Dropdown {...itemProps.repeatCount} title="Repeat Count">
          <Form.Dropdown.Item value="1" title="Play Once" />
          <Form.Dropdown.Item value="2" title="2 Times" />
          <Form.Dropdown.Item value="3" title="3 Times" />
          <Form.Dropdown.Item value="5" title="5 Times" />
          <Form.Dropdown.Item value="10" title="10 Times" />
          <Form.Dropdown.Item value="20" title="20 Times" />
        </Form.Dropdown>
      )}

      <Form.Description text="Note: You can stop the recitation anytime by pressing the stop button." />
    </Form>
  );
}
