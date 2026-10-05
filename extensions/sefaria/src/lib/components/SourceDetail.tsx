import React from "react";
import { Detail } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useSefariaText } from "../hooks/useSefaria";
import { cleanSefariaText, processEnglishText, addRTLMarkers } from "../utils/text-processing";
import { SourceDetailActionPanel, ErrorActionPanel } from "./ActionPanels";
import { APP_CONSTANTS, LANGUAGES } from "../constants/app";
import { SourceDetailProps } from "../types/sefaria";

/**
 * Reusable component for displaying Sefaria source details
 */
export function SourceDetail({ reference }: SourceDetailProps) {
  const { data, isLoading, error } = useSefariaText(reference);

  if (error) {
    showFailureToast(error, { title: APP_CONSTANTS.MESSAGES.ERROR.SOURCE_FAILED });
    return (
      <Detail
        markdown={`# ${APP_CONSTANTS.MESSAGES.ERROR.GENERAL_ERROR} Retrieving Source

Failed to retrieve: **${reference}**

**Error:** ${error.message}

[Browse Sefaria](${APP_CONSTANTS.URLS.SEFARIA_BASE})`}
        actions={<ErrorActionPanel />}
      />
    );
  }

  if (isLoading) {
    return (
      <Detail
        isLoading={true}
        markdown={`# ${APP_CONSTANTS.MESSAGES.LOADING.SOURCE}

Fetching **${reference}** from Sefaria database...

${APP_CONSTANTS.MESSAGES.LOADING.GENERAL}`}
        actions={<SourceDetailActionPanel reference={reference} hebrewText="" englishText="" footnotes={[]} />}
      />
    );
  }

  if (!data) {
    return (
      <Detail
        markdown={`# ${APP_CONSTANTS.ICONS.SEARCH} No Source Found

Reference: **${reference}**

Not found in Sefaria database.

[Search on Sefaria](${APP_CONSTANTS.URLS.SEFARIA_SEARCH}?q=${encodeURIComponent(reference)})`}
        actions={<ErrorActionPanel />}
      />
    );
  }

  // Extract Hebrew and English text
  const hebrewVersion = data.hebrew.versions.find((v) => v.language === LANGUAGES.HEBREW);
  const englishVersion = data.english?.versions.find((v) => v.language === LANGUAGES.ENGLISH);

  const hasEnglish = englishVersion?.text;
  const hasHebrew = hebrewVersion?.text;

  const rawEnglishText = hasEnglish ? cleanSefariaText(englishVersion.text) : "English translation not available";
  const rawHebrewText = hasHebrew ? cleanSefariaText(hebrewVersion.text) : "Hebrew text not available";

  // Process English text to handle footnotes
  const { cleanText: englishText, footnotes } = processEnglishText(rawEnglishText);

  // Create bilingual title with Hebrew first, English second
  const englishTitle = data.hebrew.ref || reference;
  const hebrewTitle = data.hebrew.heRef || "";

  // Add RTL markers for Hebrew text
  const hebrewTitleWithRTL = hebrewTitle ? addRTLMarkers(hebrewTitle) : "";
  const hebrewTextWithRTL = hasHebrew ? addRTLMarkers(rawHebrewText) : "Hebrew text not available";

  // Create markdown content with Hebrew title first
  const markdown = `${hebrewTitleWithRTL ? `# ${hebrewTitleWithRTL}` : ""}
${englishTitle ? `## ${englishTitle}` : ""}

---

## Hebrew Text

${hebrewTextWithRTL}

---

## English Text

${englishText}

---

${
  footnotes.length > 0
    ? `## Footnotes

${footnotes.map((note, i) => `${i + 1}. ${note}`).join("\n\n")}

---

`
    : ""
}

## Source Information

**Book:** ${data.hebrew.book || "N/A"}  
**Categories:** ${data.hebrew.categories ? data.hebrew.categories.join(", ") : "N/A"}  
**Reference:** ${data.hebrew.ref}  
**Hebrew Reference:** ${hebrewTitleWithRTL || "N/A"}  

[View on Sefaria](${APP_CONSTANTS.URLS.SEFARIA_BASE}/${encodeURIComponent(data.hebrew.ref || reference)})`;

  // Create metadata for the side panel (more compact)
  const metadata = {
    Reference: data.hebrew.ref || reference,
    "Hebrew Reference": hebrewTitleWithRTL || "N/A",
    Book: data.hebrew.book || "N/A",
    Categories: data.hebrew.categories ? data.hebrew.categories.join(", ") : "N/A",
    "Hebrew Version": hebrewVersion?.versionTitle || "N/A",
    "English Version": englishVersion?.versionTitle || "N/A",
    Footnotes: footnotes.length > 0 ? `${footnotes.length} note(s)` : "None",
  };

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Reference" text={metadata.Reference} />
          <Detail.Metadata.Label title="Hebrew Reference" text={metadata["Hebrew Reference"]} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Book" text={metadata.Book} />
          <Detail.Metadata.Label title="Categories" text={metadata.Categories} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Hebrew Version" text={metadata["Hebrew Version"]} />
          <Detail.Metadata.Label title="English Version" text={metadata["English Version"]} />
          <Detail.Metadata.Label title="Footnotes" text={metadata.Footnotes} />
        </Detail.Metadata>
      }
      actions={
        <SourceDetailActionPanel
          reference={data.hebrew.ref || reference}
          hebrewText={rawHebrewText}
          englishText={englishText}
          footnotes={footnotes}
        />
      }
    />
  );
}
