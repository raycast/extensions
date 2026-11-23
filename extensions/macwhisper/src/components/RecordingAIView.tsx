import { Action, ActionPanel, AI, Detail, environment, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, useAI, usePromise } from "@raycast/utils";
import { basename } from "node:path";
import { AI_TASKS, AITaskId, buildPrompt, TIMESTAMPED_TASKS } from "../lib/ai-tasks";
import { errorMessage, transcribeFile, TranscribeOptions } from "../lib/mw";
import { combinedTranscript, TranscriptDetail, TranscriptResult } from "./TranscriptDetail";

type Props = {
  paths: string[];
  task: AITaskId;
  language?: string;
  answerLanguage?: string;
  /** Raycast AI model; Raycast's default model when undefined. */
  model?: AI.Model;
  customPrompt?: string;
};

async function transcribeAll(paths: string[], timestamped: boolean): Promise<TranscriptResult[]> {
  const options: TranscribeOptions = timestamped ? { format: "txt", style: "segments", timestamps: true } : {};
  const results: TranscriptResult[] = [];
  for (const path of paths) results.push({ path, transcript: await transcribeFile(path, options) });
  return results;
}

export function RecordingAIView({ paths, task, language, answerLanguage, model, customPrompt }: Props) {
  const canUseAI = environment.canAccess(AI);
  const transcription = usePromise(transcribeAll, [paths, TIMESTAMPED_TASKS.has(task)], {
    execute: canUseAI,
    onError: (error) => {
      showFailureToast(error, { title: "Transcription failed" });
    },
  });
  const results = transcription.data;
  const transcript = results ? combinedTranscript(results) : "";
  const answer = useAI(buildPrompt(task, transcript, { language, answerLanguage, custom: customPrompt }), {
    execute: canUseAI && transcript.length > 0,
    model,
    creativity: task === "translate" || task === "action-items" ? "low" : "medium",
    onError: (error) => {
      showFailureToast(error, { title: "Raycast AI failed" });
    },
  });

  const title = paths.length === 1 ? basename(paths[0]) : `${paths.length} recordings`;

  if (!canUseAI) {
    return (
      <Detail
        markdown={`# Raycast AI is not available\n\nThis command needs Raycast Pro. You can still transcribe with **Transcribe File** and use \`@macwhisper\` in AI Chat once AI is enabled.`}
      />
    );
  }

  let markdown: string;
  if (transcription.error) markdown = `# Transcription failed\n\n${errorMessage(transcription.error)}`;
  else if (!results) markdown = `# Transcribing ${title}…\n\nRaycast AI starts as soon as the transcript is ready.`;
  else if (answer.error) markdown = `# Raycast AI failed\n\n${errorMessage(answer.error)}`;
  else markdown = answer.data || "_Thinking…_";

  return (
    <Detail
      navigationTitle={`${AI_TASKS[task].title} · ${title}`}
      isLoading={transcription.isLoading || answer.isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {answer.data && <Action.CopyToClipboard title="Copy Answer" content={answer.data} />}
          {answer.data && <Action.Paste title="Paste Answer" content={answer.data} />}
          {results && (
            <Action.Push
              title="Show Transcript"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              target={<TranscriptDetail results={results} format="txt" />}
            />
          )}
          {results && (
            <Action
              title="Regenerate"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={answer.revalidate}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
