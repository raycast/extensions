import { getPreferenceValues } from "@raycast/api";
import { KnownBlock } from "@slack/types";

const SECTION_TEXT_MAX_LENGTH = 3000;
const MAX_SECTION_BLOCKS = 49;

function splitTextForSectionBlocks(text: string): string[] | undefined {
  if (text.length <= SECTION_TEXT_MAX_LENGTH) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (chunks.length >= MAX_SECTION_BLOCKS) {
      return undefined;
    }

    if (remaining.length <= SECTION_TEXT_MAX_LENGTH) {
      chunks.push(remaining);
      break;
    }

    const chunk = remaining.slice(0, SECTION_TEXT_MAX_LENGTH);
    const newlineIndex = chunk.lastIndexOf("\n");

    if (newlineIndex > 0) {
      chunks.push(remaining.slice(0, newlineIndex));
      remaining = remaining.slice(newlineIndex + 1);
      continue;
    }

    chunks.push(chunk);
    remaining = remaining.slice(SECTION_TEXT_MAX_LENGTH);
  }

  return chunks;
}

export function getAiMessageBlocks(text: string, action: "sent" | "updated" = "sent"): KnownBlock[] | undefined {
  const { showAiMessageSignature } = getPreferenceValues<Preferences>();

  if (!showAiMessageSignature) {
    return undefined;
  }

  const textChunks = splitTextForSectionBlocks(text);
  if (!textChunks) {
    return undefined;
  }

  const sectionBlocks: KnownBlock[] = textChunks.map((chunk) => ({
    type: "section",
    text: {
      type: "mrkdwn",
      text: chunk,
    },
  }));

  return [
    ...sectionBlocks,
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: action === "updated" ? "Updated via Raycast" : "Sent via Raycast",
        },
      ],
    },
  ];
}
