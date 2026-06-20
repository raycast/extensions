import { Action, ActionPanel, Clipboard, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { WordResult } from "../types/word";
import { playPronunciation } from "../services/pronunciation";
import { isFavorite, toggleFavorite } from "../storage/favorites";
import { renderWordCsv, renderWordMarkdown } from "../utils/markdown";

type WordDetailProps = {
  result: WordResult;
};

export function WordDetail({ result }: WordDetailProps) {
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    void isFavorite(result.word).then(setFavorite);
  }, [result.word]);

  return (
    <Detail
      markdown={renderDetailMarkdown(result)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Pronunciation">
            {result.phonetics
              .filter((phonetic) => phonetic.audioUrl)
              .map((phonetic) => (
                <Action
                  key={`${phonetic.region}-${phonetic.audioUrl}`}
                  title={`Play ${renderPronunciationRegion(phonetic.region)} Pronunciation`}
                  icon={Icon.SpeakerHigh}
                  onAction={() => void handlePlay(phonetic.audioUrl)}
                />
              ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Learning">
            <Action
              title={favorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={favorite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => void handleToggleFavorite(result.word, setFavorite)}
            />
            <Action.CopyToClipboard
              title="Copy Markdown"
              content={renderWordMarkdown(result)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="Copy CSV"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              onAction={() => void handleCopyCsv(result)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function handlePlay(audioUrl?: string): Promise<void> {
  if (!audioUrl) return;

  try {
    await playPronunciation(audioUrl);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Pronunciation Playback Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleToggleFavorite(word: string, setFavorite: (value: boolean) => void): Promise<void> {
  const nextFavorite = await toggleFavorite(word);
  setFavorite(nextFavorite);
  await showToast({
    style: Toast.Style.Success,
    title: nextFavorite ? "Added to Favorites" : "Removed from Favorites",
    message: word,
  });
}

async function handleCopyCsv(result: WordResult): Promise<void> {
  await Clipboard.copy(renderWordCsv(result));
  await showToast({ style: Toast.Style.Success, title: "Copied CSV" });
}

function renderDetailMarkdown(result: WordResult): string {
  const lines = [
    `# ${result.word}`,
    "",
    renderPhonetics(result),
    result.syllables ? `**Syllables**: ${result.syllables}` : undefined,
    result.pronunciationHint ? `**Pronunciation Hint**: ${result.pronunciationHint}` : undefined,
    "",
    "## Meaning Notes",
    ...result.localDefinitions.map((definition, index) => `${index + 1}. ${definition}`),
    "",
    "## English Definitions",
    ...(result.definitions.length > 0
      ? result.definitions.map((definition) => `- **${definition.partOfSpeech}.** ${definition.english}`)
      : ["- No remote English definitions found."]),
    "",
    "## Examples",
    ...(result.examples.length > 0
      ? result.examples.map((definition) => `- ${definition.example ?? definition.english}`)
      : ["- No examples found."]),
    "",
    "## Inflections",
    `- Base Form: ${result.inflections.base}`,
    result.inflections.past ? `- Past: ${result.inflections.past}` : undefined,
    result.inflections.pastParticiple ? `- Past Participle: ${result.inflections.pastParticiple}` : undefined,
    result.inflections.presentParticiple ? `- Present Participle: ${result.inflections.presentParticiple}` : undefined,
    result.inflections.plural ? `- Plural: ${result.inflections.plural}` : undefined,
    "",
    "## Common Collocations",
    ...(result.collocations.length > 0
      ? result.collocations.map((item) => `- ${item}`)
      : ["- No local collocations found."]),
    "",
    "## Synonyms",
    ...(result.synonyms.length > 0 ? result.synonyms.map((item) => `- ${item}`) : ["- No synonyms found."]),
    "",
    ...renderTechSection(result),
    "---",
    `Source: ${renderSource(result.source)} · Updated: ${new Date(result.updatedAt).toLocaleString("en-US")}`,
  ].filter((line): line is string => line !== undefined);

  return lines.join("\n");
}

function renderPhonetics(result: WordResult): string | undefined {
  if (result.phonetics.length === 0) return undefined;
  return result.phonetics.map((phonetic) => `**${phonetic.region}** ${phonetic.text ?? ""}`.trim()).join("  \n");
}

function renderTechSection(result: WordResult): string[] {
  const entry = result.techEntry;
  if (!entry) return [];

  return [
    "## Operations Context",
    `**Scenario**: ${entry.meaning}`,
    "",
    entry.explanation,
    "",
    `**Domains**: ${entry.domains.join(", ")}`,
    "",
    "### Common Causes",
    ...(entry.commonCauses ?? []).map((item) => `- ${item}`),
    "",
    "### Common Fixes",
    ...(entry.solutions ?? []).map((item) => `- ${item}`),
    "",
    "### Useful Commands",
    ...(entry.commands ?? []).map((item) => `- ${item}`),
    "",
    "### Technical Examples",
    ...(entry.examples ?? []).map((item) => `- ${item}`),
    "",
  ];
}

function renderSource(source: WordResult["source"]): string {
  if (source === "cache") return "Local Cache";
  if (source === "local") return "Local Dictionary";
  return "Remote Dictionary";
}

function renderPronunciationRegion(region: string): string {
  if (region === "US") return "US";
  if (region === "UK") return "UK";
  return "Available";
}
