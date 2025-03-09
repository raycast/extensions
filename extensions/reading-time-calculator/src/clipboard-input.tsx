import { Clipboard, Detail, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

import { Preferences } from "./types";
import { calculateReadingTime } from "./utils/reading-time";
import { getPreferenceValues } from "@raycast/api";

export default function Command() {
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { readingSpeed } = getPreferenceValues<Preferences>();
  const wpm = parseInt(readingSpeed || "130", 10);

  useEffect(() => {
    async function getClipboardText() {
      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText) {
          setText(clipboardText);
        } else {
          await showHUD("No text in clipboard");
        }
      } catch (error) {
        await showFailureToast("Failed to read clipboard");
      } finally {
        setIsLoading(false);
      }
    }

    getClipboardText();
  }, []);

  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const wordCount = words.length;
  const readingTime = calculateReadingTime(wordCount, wpm);

  const markdown = `
# Reading Time Calculator

${
  text
    ? `## Text
\`\`\`
${text}
\`\`\`

`
    : ""
}## Statistics
- Reading Time: ${readingTime}
- Word Count: ${wordCount}
- Reading Speed: ${wpm} WPM
`;

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
