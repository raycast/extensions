import { GoogleGenAI } from "@google/genai";
import { useStore } from "@nanostores/react";
import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { atom } from "nanostores";
import { computedDynamic } from "nanostores-computed-dynamic";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ReactElement, useState } from "react";
import { uuidv7 } from "uuidv7";

function transcribe(buffer: Buffer) {
  const { gemini_api_key } = getPreferenceValues<{ gemini_api_key: string; default_action: string }>();
  const ai = new GoogleGenAI({ apiKey: gemini_api_key });
  return ai.models.generateContentStream({
    model: "gemini-2.0-flash",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "audio/mp3",
              data: buffer.toString("base64"),
            },
          },
          {
            text: 'Please transcribe any speech in this audio. Ignore non-speech elements. For Thai text, only add spaces between sentences, phrases, or between Thai and non-Thai words. Do not add spaces between Thai words in the same sentence. If there is no speech, respond with "No speech detected".',
          },
        ],
      },
    ],
    config: {
      thinkingConfig: {
        includeThoughts: true,
      },
    },
  });
}

interface ControllerState {
  recordingItemKey: string;
  currentRecording: Recording | null;
  stoppedRecordings: Recording[];
}

class RecordingController {
  $state = atom<ControllerState>({
    recordingItemKey: uuidv7(),
    currentRecording: null,
    stoppedRecordings: [],
  });
  startRecording() {
    console.log("Recording started");
    const currentState = this.$state.get();
    const currentKey = currentState.recordingItemKey;
    const recording = new Recording({
      key: currentKey,
      onStopped: () => {
        const state = this.$state.get();
        if (state.currentRecording === recording) {
          this.$state.set({
            recordingItemKey: uuidv7(),
            currentRecording: null,
            stoppedRecordings: [recording, ...state.stoppedRecordings],
          });
        }
      },
    });
    this.$state.set({
      ...currentState,
      currentRecording: recording,
    });
  }
  deleteRecording(recording: Recording) {
    const state = this.$state.get();
    const updated = state.stoppedRecordings.filter((r) => r.id !== recording.id);
    this.$state.set({
      ...state,
      stoppedRecordings: updated,
    });
  }
  $list = computedDynamic((use): ReactElement[] => {
    const state = use(this.$state);
    const { recordingItemKey, currentRecording, stoppedRecordings } = state;
    const isRecording = !!currentRecording;

    const listItems: ReactElement[] = [];

    // Add recording item
    listItems.push(
      <List.Item
        key={recordingItemKey}
        title={isRecording ? "Now recording…" : "Start recording"}
        icon={isRecording ? Icon.Stop : Icon.CircleFilled}
        actions={
          <ActionPanel>
            <Action
              title={isRecording ? "Stop Recording" : "Start Recording"}
              icon={isRecording ? Icon.Stop : Icon.CircleFilled}
              onAction={isRecording ? () => currentRecording.stop() : () => this.startRecording()}
            />
          </ActionPanel>
        }
        detail={isRecording ? <CurrentRecordingDetail currentRecording={currentRecording} /> : null}
      />,
    );

    // Add stopped recordings
    for (const recording of stoppedRecordings) {
      const transcription = use(recording.$transcription);
      listItems.push(
        <List.Item
          key={recording.key}
          title={formatTime(recording.createdAt)}
          subtitle={transcription?.transcription || ""}
          icon={Icon.Microphone}
          detail={<StoppedRecordingDetail recording={recording} />}
          actions={<StoppedRecordingActions recording={recording} onDelete={() => this.deleteRecording(recording)} />}
        />,
      );
    }

    return listItems;
  });
}

interface TranscriptionState {
  finished: boolean;
  transcription: string;
  error: string | null;
}

class Recording {
  id = uuidv7();
  key: string;
  createdAt = Date.now();
  $duration = atom(0);
  $transcription = atom<TranscriptionState | null>(null);
  $status = atom<"recording" | "stopping" | "stopped">("recording");
  recorder: AudioRecorder;
  private abortController: AbortController;
  constructor(private options: { key: string; onStopped: () => void }) {
    this.key = options.key;
    this.abortController = new AbortController();
    this.recorder = new AudioRecorder(this.id, this.abortController.signal);
    this.recorder.finishPromise.then(() => {
      this.$status.set("stopped");
      this.options.onStopped();
      mkdirSync(dirname(this.mp3Path), { recursive: true });
      writeFileSync(this.mp3Path, this.recorder.getBuffer());
      this.transcribe();
    });
  }
  get mp3Path() {
    return `/tmp/vxg/${this.id}.mp3`;
  }
  get txtPath() {
    return `/tmp/vxg/${this.id}.txt`;
  }
  stop() {
    if (this.$status.get() !== "recording") {
      return;
    }
    this.$status.set("stopping");
    this.abortController.abort();
  }
  async transcribe() {
    if (this.$transcription.get() && !this.$transcription.get()!.finished) {
      return;
    }
    const buffer = this.recorder.getBuffer();
    this.$transcription.set({
      finished: false,
      transcription: "",
      error: null,
    });
    let transcription = "";
    try {
      const stream = await transcribe(buffer);
      for await (const chunk of stream) {
        for (const part of chunk.candidates?.[0]?.content?.parts || []) {
          if (part.thought) {
            console.log("Thought:", part.text);
          }
        }
        if (chunk.text) {
          transcription += chunk.text;
          this.$transcription.set({
            finished: false,
            transcription,
            error: null,
          });
        }
      }
      this.$transcription.set({
        finished: true,
        transcription,
        error: null,
      });
      // Write transcription to .txt file
      writeFileSync(this.txtPath, transcription, "utf8");
    } catch (error: unknown) {
      this.$transcription.set({
        finished: true,
        transcription,
        error: String(error),
      });
      console.error("Error during transcription:", error);
      return;
    }
  }
}

class AudioRecorder {
  $levels = atom("[      |      ]");
  $duration = atom("00:00:00.00");
  finishPromise: Promise<void>;
  buffers: Buffer[] = [];
  constructor(
    private id: string,
    abortSignal: AbortSignal,
  ) {
    const child = spawn(
      `/opt/homebrew/bin/sox -c 1 -t coreaudio "MacBook Pro Microphone" -t mp3 -C 128 --buffer 256 -`,
      { shell: true },
    );
    child.stderr.setEncoding("utf-8");
    child.stderr.on("data", (c) => {
      const levelMatch = c.match(/\[[-= |]+\]/);
      if (levelMatch) {
        this.$levels.set(levelMatch[0]);
      }

      const durationMatch = c.match(/\d\d:\d\d:\d\d\.\d\d/);
      if (durationMatch) {
        this.$duration.set(durationMatch[0]);
      }
    });
    child.stdout.on("data", (c) => {
      this.buffers.push(c);
    });
    abortSignal.addEventListener("abort", () => {
      child.kill("SIGINT");
    });
    this.finishPromise = new Promise((resolve) => {
      child.on("close", () => {
        resolve();
      });
    });
  }
  getBuffer() {
    return Buffer.concat(this.buffers);
  }
}

export default function Command() {
  const [controller] = useState(() => new RecordingController());
  const listItems = useStore(controller.$list);
  return <List isShowingDetail>{listItems}</List>;
}

const CurrentRecordingDetail: React.FC<{ currentRecording: Recording }> = ({ currentRecording }) => {
  const status = useStore(currentRecording.$status);
  const duration = useStore(currentRecording.recorder.$duration);
  const levels = useStore(currentRecording.recorder.$levels);
  return (
    <List.Item.Detail
      markdown={`# ${status}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Duration" text={duration} />
          <List.Item.Detail.Metadata.Label title="Sound Level" text={levels} />
        </List.Item.Detail.Metadata>
      }
    />
  );
};

const StoppedRecordingDetail: React.FC<{ recording: Recording }> = ({ recording }) => {
  const transcription = useStore(recording.$transcription);
  const getTranscriptionMarkdown = (transcription: TranscriptionState) => {
    let text = transcription.transcription;
    if (!transcription.finished) {
      text += "...";
    }
    if (transcription.error) {
      text += `\n\nError: ${transcription.error}`;
    }
    return text;
  };

  return (
    <List.Item.Detail
      isLoading={!transcription?.finished}
      markdown={transcription ? getTranscriptionMarkdown(transcription) : `No transcription`}
    />
  );
};

const StoppedRecordingActions: React.FC<{ recording: Recording; onDelete: () => void }> = ({ recording, onDelete }) => {
  const transcription = useStore(recording.$transcription);
  const textToCopy = String(transcription?.transcription || "No transcription").trim();
  const { default_action } = getPreferenceValues<{ gemini_api_key: string; default_action: string }>();

  const isTypeFirst = default_action !== "copy";
  const decapitalizedText = textToCopy.charAt(0).toLowerCase() + textToCopy.slice(1);

  return (
    <ActionPanel>
      <Action.Paste
        title="Type"
        content={textToCopy}
        shortcut={isTypeFirst ? undefined : { modifiers: ["cmd"], key: "return" }}
      />
      <Action.Paste
        title="Type (Decapitalized)"
        content={decapitalizedText}
        shortcut={{ modifiers: ["shift"], key: "return" }}
      />
      <Action.CopyToClipboard
        title="Copy"
        content={textToCopy}
        shortcut={isTypeFirst ? { modifiers: ["cmd"], key: "return" } : undefined}
      />
      <Action.CopyToClipboard
        title="Copy (Decapitalized)"
        content={decapitalizedText}
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
      />
      <Action
        title="Retry"
        icon={Icon.Repeat}
        onAction={() => {
          recording.transcribe();
        }}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Delete"
        icon={Icon.Trash}
        onAction={onDelete}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
      />
      <Action.ShowInFinder
        title="Show in Finder"
        path={recording.mp3Path}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
    </ActionPanel>
  );
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}
