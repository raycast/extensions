import React, { useEffect, useState } from "react";
import { getSelectedText, Action, ActionPanel, Detail, showToast, Icon } from "@raycast/api";
import { FAILED_TO_GET_TEXT } from "./constants";
import useAISummary from "./hooks/useAISummary";
import { OpenPreferences } from "./openPreferences";

/**
 * App Component.
 *
 * This functional component serves as the main application entry point for the summarizeBlocks
 * command. It fetches selected text
 * to generate a summary via the useAISummary custom hook.
 *
 * If the prefMessage is set (meaning there's an issue with the user's preferences), the
 * OpenPreferences component is displayed to prompt the user to adjust their preferences.
 * Otherwise, a Detail component containing the summary and associated actions is rendered.
 *
 * @returns JSX.Element - Either the OpenPreferences component or a Detail component based on conditions.
 */
const App: React.FC = () => {
  const [selectedText, setSelectedText] = useState<string | null>(null);

  // Custom hook to obtain summary
  const { summary, isLoading, prefMessage } = useAISummary(selectedText);

  useEffect(() => {
    // Fetch selected text when the component mounts
    getSelectedText()
      .then(setSelectedText)
      .catch((error: Error) => {
        if (error instanceof Error) {
          showToast(FAILED_TO_GET_TEXT);
        }
      });
  }, []);

  return prefMessage ? (
    <OpenPreferences prefMessage={prefMessage ?? ""} />
  ) : (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Summary" content={summary ?? ""} />
          <Action.OpenInBrowser
            title="Continue in Chat"
            icon={Icon.SpeechBubble}
            url={`raycast://extensions/raycast/raycast-ai/ai-chat?fallbackText=${encodeURIComponent(
              summary as string
            )}`}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
      markdown={summary}
    />
  );
};

export default App;
