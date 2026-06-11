/**
 * Word details component for displaying comprehensive word information
 */

import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { DudenWord } from "../types/duden";

interface WordDetailsProps {
  word: DudenWord;
}

export default function WordDetails({ word }: WordDetailsProps) {
  // Build the markdown content
  let markdown = `# ${word.title}\n\n`;

  // Basic information
  if (word.partOfSpeech) {
    markdown += `**Wortart:** ${word.partOfSpeech}\n\n`;
  }

  if (word.frequency !== undefined) {
    const freq = Math.min(5, Math.max(0, word.frequency));
    const stars = "★".repeat(freq) + "☆".repeat(5 - freq);
    markdown += `**Häufigkeit:** ${stars} (${freq}/5)\n\n`;
  }

  if (word.usage) {
    markdown += `**Gebrauch:** ${word.usage}\n\n`;
  }

  // Word separation
  if (word.wordSeparation && word.wordSeparation.length > 0) {
    markdown += `**Worttrennung:** ${word.wordSeparation.join("|")}\n\n`;
  }

  // Pronunciation
  if (word.phonetic) {
    markdown += `**Aussprache:** /${word.phonetic}/\n\n`;
  }

  // Alternative spellings
  if (word.alternativeSpellings && word.alternativeSpellings.length > 0) {
    markdown += `**Alternative Schreibweisen:** ${word.alternativeSpellings.join(", ")}\n\n`;
  }

  // Meanings
  if (word.meaningOverview) {
    markdown += `## Bedeutung\n\n`;
    if (typeof word.meaningOverview === "string") {
      markdown += `${word.meaningOverview}\n\n`;
    } else {
      // Handle array or object structures
      markdown += `${JSON.stringify(word.meaningOverview, null, 2)}\n\n`;
    }
  }

  // Examples
  if (word.examples) {
    markdown += `## Beispiele\n\n`;
    markdown += `${word.examples}\n\n`;
  }

  // Synonyms
  if (word.synonyms) {
    markdown += `## Synonyme\n\n`;
    markdown += `${word.synonyms}\n\n`;
  }

  // Origin
  if (word.origin) {
    markdown += `## Herkunft\n\n`;
    markdown += `${word.origin}\n\n`;
  }

  const actions = (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy Word"
        content={word.name}
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {word.meaningOverview && (
        <Action.CopyToClipboard
          title="Copy Meaning"
          content={
            typeof word.meaningOverview === "string" ? word.meaningOverview : JSON.stringify(word.meaningOverview)
          }
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      )}
      {word.phonetic && (
        <Action.CopyToClipboard
          title="Copy Pronunciation"
          content={word.phonetic}
          icon={Icon.SpeakerOn}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      )}
      <Action.OpenInBrowser
        title="Open in Duden.de"
        url={`https://www.duden.de/rechtschreibung/${word.urlname}`}
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
    </ActionPanel>
  );

  return (
    <Detail
      markdown={markdown}
      actions={actions}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={word.name} />
          {word.article && <Detail.Metadata.Label title="Artikel" text={word.article} />}
          {word.partOfSpeech && <Detail.Metadata.Label title="Wortart" text={word.partOfSpeech} />}
          {word.frequency !== undefined && <Detail.Metadata.Label title="Häufigkeit" text={`${word.frequency}/5`} />}
          {word.phonetic && <Detail.Metadata.Label title="IPA" text={word.phonetic} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Duden.de"
            text={word.urlname}
            target={`https://www.duden.de/rechtschreibung/${word.urlname}`}
          />
        </Detail.Metadata>
      }
    />
  );
}
