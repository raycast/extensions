import {
  Detail,
  ActionPanel,
  Action,
  LaunchProps,
  getPreferenceValues,
  Clipboard,
  showToast,
  Toast,
  Color,
  Icon,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";

// 出力スキーマ定義
const ResponseSchema = z.object({
  japanese_translation: z.string().describe("The natural Japanese translation."),
  feedback: z.string().describe("Constructive feedback on grammar/nuance in English."),
  confidence_score: z.number().describe("Evaluation score from 0 to 100."),
  detected_nuance: z.string().describe("Tone detection (e.g., 'Casual', 'Formal')."),
});

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface Preferences {
  apiKey: string;
  model: string;
}

export default function Command(props: LaunchProps<{ arguments: { text: string } }>) {
  const { text } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const [spinnerIndex, setSpinnerIndex] = useState(0);

  const { isLoading, data, error } = usePromise(
    async (inputText: string) => {
      const client = new OpenAI({ apiKey: preferences.apiKey });

      const completion = await client.beta.chat.completions.parse({
        model: preferences.model,
        messages: [
          {
            role: "system",
            content: `You are a professional English-Japanese translator and language tutor.
            1. Translate the English input into natural Japanese.
            2. Provide constructive feedback on the English input (grammar, nuance, word choice) in concise ENGLISH.
            3. Score the English quality from 0 to 100.
            4. Detect the nuance/tone of the input.`,
          },
          { role: "user", content: inputText },
        ],
        response_format: zodResponseFormat(ResponseSchema, "translation_feedback"),
      });

      const result = completion.choices[0].message.parsed;
      if (!result) throw new Error("Failed to parse output");
      return result;
    },
    [text],
    {
      onData: (data) => {
        Clipboard.copy(data.japanese_translation);
        showToast({ style: Toast.Style.Success, title: "Copied Translation!" });
      },
    },
  );

  const errorMessage = error instanceof Error ? error.message : error ? "Unexpected error occurred." : "";

  useEffect(() => {
    if (!error) return;
    showToast({
      style: Toast.Style.Failure,
      title: "Translation Failed",
      message: errorMessage,
    });
  }, [error, errorMessage]);

  useEffect(() => {
    if (!isLoading) return;
    const intervalId = setInterval(() => {
      setSpinnerIndex((current) => (current + 1) % SPINNER_FRAMES.length);
    }, 120);
    return () => clearInterval(intervalId);
  }, [isLoading]);

  // スコアの正規化
  const rawScore = data?.confidence_score ?? 0;
  const normalizedScore = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);

  const getScoreColor = (score: number) => {
    if (score >= 80) return Color.Green;
    if (score >= 50) return Color.Yellow;
    return Color.Red;
  };

  const originalMarkdown = text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  const markdown = data
    ? `${data.japanese_translation}

---

${originalMarkdown}

${data.feedback}`
    : error
      ? `**Error**\n\n${errorMessage}`
      : SPINNER_FRAMES[spinnerIndex];

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        !isLoading && data ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Translation"
              content={data.japanese_translation}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Feedback"
              content={data.feedback}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        ) : null
      }
      metadata={
        !isLoading && data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Score"
              text={`${normalizedScore} / 100`}
              icon={{ source: Icon.Star, tintColor: getScoreColor(normalizedScore) }}
            />
            <Detail.Metadata.TagList title="Tone">
              <Detail.Metadata.TagList.Item text={data.detected_nuance} color={Color.Blue} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Model" text={preferences.model} />
            <Detail.Metadata.Label title="Chars" text={`${text.length}`} />
          </Detail.Metadata>
        ) : null
      }
    />
  );
}
