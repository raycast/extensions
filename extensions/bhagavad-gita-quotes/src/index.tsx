import {
  List,
  Icon,
  getPreferenceValues,
  ActionPanel,
  Action,
  AI,
  environment,
  Toast,
  showToast,
  openExtensionPreferences,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { AIExplanation } from "./components/AIExplanation";
import { ComparableQuote } from "./components/ComparableQuote";
import { getErrorMessage, getThemeColor } from "./utils";

interface VedicChapter {
  chapter_number: number;
  name?: string;
  translation?: string;
  name_meaning?: string;
  verses_count: number;
  meaning?: {
    en?: string;
    hi?: string;
  };
}

interface RapidChapter {
  chapter_number: number;
  name_meaning?: string;
  verses_count: number;
}

interface Verse {
  chapter: number;
  verse: number;
  sanskrit: string;
  translation: string;
}

interface VedicSlokResponse {
  chapter: number;
  verse: number;
  slok: string;
  siva?: { et?: string };
  tej?: { ht?: string };
  adi?: { et?: string };
  gambir?: { et?: string };
}

interface RapidVerseResponse {
  chapter_number: number;
  verse_number: number;
  text: string;
  translations?: Array<{ description?: string }>;
}

const VEDIC_VERSE_FETCH_BATCH = 8;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const colorScheme = preferences.colorScheme;
  const isVedic = preferences.apiSource === "vedic";
  const canUseAI = environment.canAccess(AI);

  const themeColor = getThemeColor(colorScheme);

  // Headers for the RapidAPI option
  const apiHeaders: Record<string, string> = isVedic
    ? {}
    : {
        "X-RapidAPI-Key": preferences.apiKey || "",
        "X-RapidAPI-Host": "bhagavad-gita3.p.rapidapi.com",
      };

  const options = {
    headers: apiHeaders,
  };

  const url = isVedic
    ? "https://vedicscriptures.github.io/chapters"
    : "https://bhagavad-gita3.p.rapidapi.com/v2/chapters/?limit=18";

  const { isLoading, data, error } = useFetch<VedicChapter[] | RapidChapter[]>(url, {
    ...options,
    execute: isVedic || !!preferences.apiKey,
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch chapters",
        message: err.message,
      });
    },
  });

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Error fetching data. Check preferences!"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const chapters: Array<VedicChapter | RapidChapter> = Array.isArray(data)
    ? (data as Array<VedicChapter | RapidChapter>)
    : [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search chapters...">
      {chapters.map((ch: VedicChapter | RapidChapter) => {
        const title = isVedic
          ? `Chapter ${ch.chapter_number}: ${(ch as VedicChapter).name ?? ""}`
          : `Chapter ${ch.chapter_number}: ${(ch as RapidChapter).name_meaning ?? ""}`;

        const subtitle = isVedic
          ? `${(ch as VedicChapter).translation ?? ""} • ${ch.verses_count} Verses`
          : `${ch.verses_count} Verses`;

        const keywords = isVedic
          ? ([
              (ch as VedicChapter).name,
              (ch as VedicChapter).translation,
              (ch as VedicChapter).meaning?.en,
              (ch as VedicChapter).meaning?.hi,
            ].filter((v): v is string => typeof v === "string" && v.length > 0) as string[])
          : [(ch as RapidChapter).name_meaning].filter((v): v is string => typeof v === "string" && v.length > 0);

        return (
          <List.Item
            key={ch.chapter_number}
            title={title}
            subtitle={subtitle}
            keywords={keywords}
            icon={{ source: Icon.Book, tintColor: themeColor }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Verses"
                  target={<VersesList chapterNumber={ch.chapter_number} versesCount={ch.verses_count} />}
                />
                {canUseAI ? (
                  <Action.Push
                    title={`Summarize in ${preferences.translationLanguage}`}
                    icon={Icon.Stars}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    target={
                      <AIExplanation
                        title={`Chapter ${ch.chapter_number} Summary`}
                        prompt={`Summarize the key themes and lessons from Chapter ${ch.chapter_number} of the Bhagavad Gita. Please provide your response in ${preferences.translationLanguage}.`}
                      />
                    }
                  />
                ) : (
                  <Action.OpenInBrowser
                    title="Learn About Raycast AI"
                    icon={Icon.Stars}
                    url="https://www.raycast.com/pro"
                  />
                )}
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && chapters.length === 0 && (
        <List.EmptyView
          title="No chapters found"
          description={
            !isVedic && !preferences.apiKey
              ? "Please set your RapidAPI key in preferences or switch to Vedic Scriptures source."
              : "Try a different search term"
          }
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function VersesList({ chapterNumber, versesCount }: { chapterNumber: number; versesCount: number }) {
  const preferences = getPreferenceValues<Preferences>();
  const isVedic = preferences.apiSource === "vedic";
  const canUseAI = environment.canAccess(AI);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const themeColor = getThemeColor(preferences.colorScheme);

  // Vedic API: verse-by-verse fetch in small batches to limit concurrency.
  // RapidAPI: single request. Cancellation avoids setState after unmount.
  useEffect(() => {
    let cancelled = false;

    const fetchVerses = async () => {
      try {
        if (isVedic) {
          const results: VedicSlokResponse[] = [];
          for (let start = 1; start <= versesCount; start += VEDIC_VERSE_FETCH_BATCH) {
            if (cancelled) return;
            const end = Math.min(start + VEDIC_VERSE_FETCH_BATCH - 1, versesCount);
            const batch: Array<Promise<VedicSlokResponse>> = [];
            for (let i = start; i <= end; i++) {
              batch.push(
                fetch(`https://vedicscriptures.github.io/slok/${chapterNumber}/${i}`).then(
                  (r) => r.json() as Promise<VedicSlokResponse>,
                ),
              );
            }
            const batchResults = await Promise.all(batch);
            results.push(...batchResults);
          }
          if (cancelled) return;
          const formatted: Verse[] = results.map((v) => ({
            chapter: v.chapter,
            verse: v.verse,
            sanskrit: v.slok,
            translation: v.siva?.et || v.tej?.ht || v.adi?.et || v.gambir?.et || "Translation not available",
          }));
          setVerses(formatted);
        } else {
          // Rapid API
          const options = {
            method: "GET",
            headers: {
              "X-RapidAPI-Key": preferences.apiKey || "",
              "X-RapidAPI-Host": "bhagavad-gita3.p.rapidapi.com",
            },
          };
          const response = await fetch(
            `https://bhagavad-gita3.p.rapidapi.com/v2/chapters/${chapterNumber}/verses/`,
            options,
          );
          const data = await response.json();
          if (cancelled) return;
          // Map rapidapi data to Verse format
          if (Array.isArray(data)) {
            const formatted: Verse[] = (data as RapidVerseResponse[]).map((v) => ({
              chapter: v.chapter_number,
              verse: v.verse_number,
              sanskrit: v.text,
              translation: v.translations?.[0]?.description || "",
            }));
            setVerses(formatted);
          } else if (!cancelled) {
            showToast({
              style: Toast.Style.Failure,
              title: "Failed to fetch verses",
              message: "Unexpected response from RapidAPI. Check your API key.",
            });
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch verses",
            message: getErrorMessage(err),
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchVerses();
    return () => {
      cancelled = true;
    };
  }, [chapterNumber, versesCount, isVedic, preferences.apiKey]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search Verses in Chapter ${chapterNumber}...`}
      isShowingDetail={true}
    >
      {verses.map((v) => (
        <List.Item
          key={`${v.chapter}-${v.verse}`}
          title={`Verse ${v.verse} - ${v.translation.replace(/^[\d.]+\s*/, "")}`}
          subtitle=""
          keywords={[v.translation, v.sanskrit]}
          icon={{ source: Icon.TextDocument, tintColor: themeColor }}
          detail={
            <List.Item.Detail
              markdown={`## Chapter ${v.chapter}, Verse ${v.verse}\n\n---\n\n${
                preferences.showSanskrit
                  ? `### Sanskrit\n\n> **${v.sanskrit.replace(/\n/g, "**  \n> **")}**\n\n---\n\n`
                  : ""
              }### Translation\n\n${v.translation}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Translation"
                content={`${v.translation} - Bhagavad Gita ${v.chapter}:${v.verse}`}
              />
              {preferences.showSanskrit && (
                <Action.CopyToClipboard
                  title="Copy Sanskrit"
                  content={`${v.sanskrit}\n- Bhagavad Gita ${v.chapter}:${v.verse}`}
                />
              )}
              {canUseAI ? (
                <>
                  <Action.Push
                    title={`Explain in ${preferences.translationLanguage}`}
                    icon={Icon.Stars}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={
                      <AIExplanation
                        title={`Chapter ${v.chapter}, Verse ${v.verse} Explanation`}
                        prompt={`Provide a philosophical explanation and practical modern-day application of this Bhagavad Gita verse (Chapter ${v.chapter}, Verse ${v.verse}, Sanskrit: "${v.sanskrit}"). Please provide your response in ${preferences.translationLanguage}.`}
                      />
                    }
                  />
                  <Action.Push
                    title={`Translate to ${preferences.translationLanguage}`}
                    icon={Icon.Message}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    target={
                      <AIExplanation
                        title={`Chapter ${v.chapter}, Verse ${v.verse} Translation`}
                        prompt={`Translate this Bhagavad Gita verse directly from Sanskrit into ${preferences.translationLanguage}: "${v.sanskrit}". Provide the direct translation first, followed by a brief textual meaning in ${preferences.translationLanguage}.`}
                      />
                    }
                  />
                  <ActionPanel.Section title="Comparable Quote In">
                    <Action.Push
                      title="Bible"
                      icon={Icon.Book}
                      target={
                        <ComparableQuote
                          chapter={v.chapter}
                          verse={v.verse}
                          sanskrit={v.sanskrit}
                          translation={v.translation}
                          language={preferences.translationLanguage}
                          targetScripture="Bible"
                        />
                      }
                    />
                    <Action.Push
                      title="Quran"
                      icon={Icon.Book}
                      target={
                        <ComparableQuote
                          chapter={v.chapter}
                          verse={v.verse}
                          sanskrit={v.sanskrit}
                          translation={v.translation}
                          language={preferences.translationLanguage}
                          targetScripture="Quran"
                        />
                      }
                    />
                    <Action.Push
                      title="Torah"
                      icon={Icon.Book}
                      target={
                        <ComparableQuote
                          chapter={v.chapter}
                          verse={v.verse}
                          sanskrit={v.sanskrit}
                          translation={v.translation}
                          language={preferences.translationLanguage}
                          targetScripture="Torah"
                        />
                      }
                    />
                    <Action.Push
                      title="Dhammapada"
                      icon={Icon.Book}
                      target={
                        <ComparableQuote
                          chapter={v.chapter}
                          verse={v.verse}
                          sanskrit={v.sanskrit}
                          translation={v.translation}
                          language={preferences.translationLanguage}
                          targetScripture="Dhammapada"
                        />
                      }
                    />
                  </ActionPanel.Section>
                </>
              ) : (
                <Action.OpenInBrowser
                  title="Learn About Raycast AI"
                  icon={Icon.Stars}
                  url="https://www.raycast.com/pro"
                />
              )}
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
