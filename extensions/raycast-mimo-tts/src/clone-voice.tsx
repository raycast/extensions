import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { readFileSync, statSync } from "fs";
import { extname } from "path";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildOptionsForModel, synthesizeSpeech } from "./api/mimo-tts";
import type { VoiceCloneSample } from "./api/mimo-types";
import { AudioPlayer } from "./utils/audio-player";
import { showTTSFailure } from "./utils/mimo-feedback";
import { clearPlaybackStopRequest } from "./utils/mimo-playback-state";

const MAX_SAMPLE_BYTES = 10 * 1024 * 1024; // MiMo limit: 10 MB base64-encoded.
const DEFAULT_TEXT = "Hello, this is a voice cloned from the audio sample you provided.";

interface CloneVoiceFormValues extends Form.Values {
  sample: string[];
  sampleText: string;
  stylePrompt: string;
}

export default function CloneVoice() {
  const [isLoading, setIsLoading] = useState(false);
  const [sampleText, setSampleText] = useState(DEFAULT_TEXT);
  const playerRef = useRef(new AudioPlayer());

  useEffect(() => {
    // handleSubmit swaps playerRef.current to a fresh AudioPlayer on every run,
    // so cleanup must read the ref at unmount time — not capture the initial player.
    return () => {
      playerRef.current.cleanup();
    };
  }, []);

  const handleSubmit = useCallback(async (values: CloneVoiceFormValues) => {
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

    playerRef.current.stopPlayback();
    await clearPlaybackStopRequest();
    const player = new AudioPlayer();
    playerRef.current = player;

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Cloning voice",
      message: "MiMo-V2.5-TTS-VoiceClone",
    });

    try {
      const options = await buildOptionsForModel("mimo-v2.5-tts-voiceclone", {
        baseStylePrompt: values.stylePrompt?.trim() || undefined,
        voiceCloneSample: sample,
      });
      const audio = await synthesizeSpeech(trimmedText, options, player.signal);
      if (player.isStopped()) return;
      toast.title = "Playing cloned voice";
      await player.playAudio(audio, options.format, options.playbackRate);
      if (!player.isStopped()) {
        toast.style = Toast.Style.Success;
        toast.title = "Voice clone complete";
      }
    } catch (error) {
      if (!player.isStopped()) await showTTSFailure(error, "Voice clone failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStop = useCallback(() => {
    playerRef.current.stopPlayback();
    setIsLoading(false);
  }, []);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Clone a Voice"
      actions={
        <ActionPanel>
          <Action.SubmitForm<CloneVoiceFormValues> title="Clone and Play" icon={Icon.Play} onSubmit={handleSubmit} />
          {isLoading ? (
            <Action
              title="Stop Playback"
              icon={Icon.Stop}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={handleStop}
            />
          ) : null}
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
