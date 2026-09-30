import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { readFileSync, statSync } from "fs";
import { extname } from "path";
import { useCallback, useState } from "react";
import { buildOptionsForModel } from "./api/mimo-tts";
import type { VoiceCloneSample } from "./api/mimo-types";
import { SynthesisStopAction } from "./components/synthesis-stop-action";
import { useSynthesisForm } from "./hooks/use-synthesis-form";

const MAX_SAMPLE_BYTES = 10 * 1024 * 1024; // MiMo limit: 10 MB base64-encoded.
const DEFAULT_TEXT = "Hello, this is a voice cloned from the audio sample you provided.";

interface CloneVoiceFormValues extends Form.Values {
  sample: string[];
  sampleText: string;
  stylePrompt: string;
}

export default function CloneVoice() {
  const [sampleText, setSampleText] = useState(DEFAULT_TEXT);
  const { isLoading, handleStop, runSession } = useSynthesisForm();

  const handleSubmit = useCallback(
    async (values: CloneVoiceFormValues) => {
      const samplePath = values.sample?.[0];
      if (!samplePath) {
        await showToast({ style: Toast.Style.Failure, title: "Pick an audio sample (mp3 or wav)" });
        return;
      }
      const trimmedText = values.sampleText.trim();
      if (!trimmedText) {
        await showToast({ style: Toast.Style.Failure, title: "Text to read is required" });
        return;
      }

      let sample: VoiceCloneSample;
      try {
        sample = await loadSample(samplePath);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load audio sample",
          message: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      await runSession({
        toastTitle: "Cloning voice",
        toastMessage: "MiMo-V2.5-TTS-VoiceClone",
        text: trimmedText,
        buildOptions: () =>
          buildOptionsForModel("mimo-v2.5-tts-voiceclone", {
            baseStylePrompt: values.stylePrompt?.trim() || undefined,
            voiceCloneSample: sample,
          }),
        playingTitle: "Playing cloned voice",
        successTitle: "Voice clone complete",
        failureTitle: "Voice clone failed",
      });
    },
    [runSession],
  );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Clone a Voice"
      actions={
        <ActionPanel>
          <Action.SubmitForm<CloneVoiceFormValues> title="Clone and Play" icon={Icon.Play} onSubmit={handleSubmit} />
          <SynthesisStopAction isLoading={isLoading} onStop={handleStop} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Voice Clone"
        text="Pick an mp3 or wav file (≤10 MB). MiMo replicates the voice in the sample and reads the text below. Each run is one-shot — the cloned voice is not saved."
      />
      <Form.FilePicker
        id="sample"
        title="Voice Sample"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
      <Form.TextArea
        id="sampleText"
        title="Text to Read"
        value={sampleText}
        onChange={setSampleText}
        placeholder="What should the cloned voice say?"
      />
      <Form.TextField
        id="stylePrompt"
        title="Style Instruction (Optional)"
        placeholder="e.g., Read warmly and slowly, with thoughtful pauses."
      />
    </Form>
  );
}

async function loadSample(path: string): Promise<VoiceCloneSample> {
  const stats = statSync(path);
  if (!stats.isFile()) {
    throw new Error("Pick a single audio file (mp3 or wav).");
  }

  const mimeType = mimeTypeFor(path);
  if (!mimeType) {
    throw new Error("Only mp3 and wav files are supported.");
  }

  // Early-reject obviously oversized files before loading them into memory.
  // Base64 inflates by ~33 %, so MAX_SAMPLE_BYTES of raw bytes is a safe
  // over-estimate; the precise post-encode check below remains authoritative.
  if (stats.size > MAX_SAMPLE_BYTES) {
    throw new Error("Sample exceeds the 10 MB limit after base64 encoding.");
  }

  const buffer = readFileSync(path);
  const base64 = buffer.toString("base64");
  if (base64.length > MAX_SAMPLE_BYTES) {
    throw new Error("Sample exceeds the 10 MB limit after base64 encoding.");
  }

  return { mimeType, base64 };
}

function mimeTypeFor(path: string): string | null {
  const ext = extname(path).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  return null;
}
