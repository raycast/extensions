import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { Preferences } from "../types";
import { calculateReadingTime } from "./reading-time";
import { getPreferenceValues } from "@raycast/api";

export function ReadingTimeForm({ initialText = "" }: { initialText?: string }) {
  const [text, setText] = useState<string>(initialText);
  const [readingTime, setReadingTime] = useState<string>("0");
  const [wordCount, setWordCount] = useState<number>(0);
  const { readingSpeed } = getPreferenceValues<Preferences>();

  const wpm = parseInt(readingSpeed || "130", 10);

  const processText = useCallback(
    (inputText: string) => {
      if (!inputText) {
        setReadingTime("0");
        setWordCount(0);
        return;
      }

      const words = inputText.split(/\s+/).filter((word) => word.length > 0);
      setWordCount(words.length);

      const formattedTime = calculateReadingTime(words.length, wpm);
      setReadingTime(formattedTime);
    },
    [wpm],
  );

  useEffect(() => {
    if (initialText) {
      processText(initialText);
    }
  }, [initialText, processText]);

  useEffect(() => {
    processText(text);
  }, [text, processText]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Paste
            title="Paste from Clipboard"
            content={text}
            onPaste={async (newText) => {
              try {
                setText(String(newText));
                processText(String(newText));
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to paste text",
                  message: error instanceof Error ? error.message : "Unknown error occurred",
                });
              }
            }}
          />
          <Action
            title="Clear Text"
            icon={Icon.Trash}
            onAction={() => setText("")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Enter or paste text here"
        value={text}
        onChange={(value) => setText(value)}
      />
      <Form.Description title="Reading Time" text={`${readingTime} at ${wpm} WPM | Word Count: ${wordCount}`} />
    </Form>
  );
}
