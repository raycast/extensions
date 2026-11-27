import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { basename } from "node:path";
import { combinedTranscript, TranscriptResult } from "./components/TranscriptDetail";
import { selectedFinderFiles } from "./lib/files";
import { errorMessage, transcribeFile } from "./lib/mw";

export default async function Command() {
  const files = await selectedFinderFiles();
  if (files.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No file selected in Finder",
      message: "Select audio or video files. Use Batch Transcribe Folder for folders.",
    });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Transcribing…" });
  const results: TranscriptResult[] = [];
  try {
    for (const [index, path] of files.entries()) {
      toast.message = `${index + 1}/${files.length} — ${basename(path)}`;
      results.push({ path, transcript: await transcribeFile(path) });
    }
    if (results.every((result) => !result.transcript.trim())) {
      toast.style = Toast.Style.Failure;
      toast.title = "No speech detected";
      toast.message = "Try another model or language.";
      return;
    }
    await Clipboard.copy(combinedTranscript(results));
    await showHUD(results.length === 1 ? "Transcript copied to clipboard" : `${results.length} transcripts copied`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Transcription failed";
    toast.message = errorMessage(error);
  }
}
