import { getPreferenceValues } from "@raycast/api";
import { KnownBlock } from "@slack/types";

export function getAiMessageBlocks(text: string): KnownBlock[] | undefined {
  const { showAiMessageSignature } = getPreferenceValues<Preferences>();

  if (!showAiMessageSignature) {
    return undefined;
  }

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "Sent via Raycast",
        },
      ],
    },
  ];
}
