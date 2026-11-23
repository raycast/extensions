import { Detail } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { basename } from "node:path";
import { errorMessage, OutputFormat, transcribeFile, TranscribeOptions } from "../lib/mw";
import { TranscriptDetail, TranscriptResult } from "./TranscriptDetail";

async function transcribeAll(paths: string[], options: TranscribeOptions): Promise<TranscriptResult[]> {
  const results: TranscriptResult[] = [];
  for (const path of paths) results.push({ path, transcript: await transcribeFile(path, options) });
  return results;
}

/** Transcribes `paths` sequentially, then shows the transcript with its actions. */
export function TranscriptionView({ paths, options }: { paths: string[]; options: TranscribeOptions }) {
  const format: OutputFormat = options.format ?? "txt";
  const { data, isLoading, error } = usePromise(transcribeAll, [paths, options], {
    onError: (failure) => {
      showFailureToast(failure, { title: "Transcription failed" });
    },
  });

  if (data) return <TranscriptDetail results={data} format={format} />;

  const names = paths.map((path) => `- ${basename(path)}`).join("\n");
  const markdown = error
    ? `# Transcription failed\n\n${errorMessage(error)}`
    : `# Transcribing…\n\n${names}\n\nMacWhisper is working on it. Long recordings can take a while.`;
  return <Detail isLoading={isLoading} markdown={markdown} />;
}
