import {
  Action,
  ActionPanel,
  Detail,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { readFileSync } from "fs";
import { basename } from "path";
import { apiPostMultipart, TypeWhisperError } from "./api";
import type { TranscribeResponse } from "./types";

const AUDIO_EXTENSIONS = [
  "wav",
  "mp3",
  "m4a",
  "flac",
  "ogg",
  "aac",
  "mp4",
  "webm",
];

function TranscriptionResult({
  result,
  fileName,
}: {
  result: TranscribeResponse;
  fileName: string;
}) {
  const markdown = `## Transcription\n\n${result.text}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="File" text={fileName} />
          <Detail.Metadata.Label
            title="Duration"
            text={`${result.duration.toFixed(1)}s`}
          />
          <Detail.Metadata.Label
            title="Processing Time"
            text={`${result.processing_time.toFixed(1)}s`}
          />
          <Detail.Metadata.Label title="Engine" text={result.engine} />
          {result.model && (
            <Detail.Metadata.Label title="Model" text={result.model} />
          )}
          {result.language && (
            <Detail.Metadata.Label title="Language" text={result.language} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Text" content={result.text} />
          <Action.Paste title="Paste Text" content={result.text} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: {
    file: string[];
    language: string;
    task: string;
  }) {
    const filePath = values.file?.[0];
    if (!filePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select an audio file",
      });
      return;
    }

    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    if (!AUDIO_EXTENSIONS.includes(ext)) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Unsupported format: .${ext}`,
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Transcribing...",
      message: basename(filePath),
    });

    try {
      const fileBuffer = readFileSync(filePath);
      const blob = new Blob([fileBuffer]);
      const formData = new FormData();
      formData.append("file", blob, basename(filePath));

      if (values.language && values.language !== "auto") {
        formData.append("language", values.language);
      }
      if (values.task) {
        formData.append("task", values.task);
      }

      const result = await apiPostMultipart<TranscribeResponse>(
        "/v1/transcribe",
        formData,
      );
      toast.hide();
      push(
        <TranscriptionResult result={result} fileName={basename(filePath)} />,
      );
    } catch (error) {
      const msg =
        error instanceof TypeWhisperError
          ? error.message
          : "Transcription failed";
      toast.style = Toast.Style.Failure;
      toast.title = msg;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transcribe" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Audio File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Dropdown id="language" title="Language" defaultValue="auto">
        <Form.Dropdown.Item value="auto" title="Auto-detect" />
        <Form.Dropdown.Item value="en" title="English" />
        <Form.Dropdown.Item value="de" title="German" />
        <Form.Dropdown.Item value="fr" title="French" />
        <Form.Dropdown.Item value="es" title="Spanish" />
        <Form.Dropdown.Item value="it" title="Italian" />
        <Form.Dropdown.Item value="pt" title="Portuguese" />
        <Form.Dropdown.Item value="nl" title="Dutch" />
        <Form.Dropdown.Item value="ja" title="Japanese" />
        <Form.Dropdown.Item value="ko" title="Korean" />
        <Form.Dropdown.Item value="zh" title="Chinese" />
      </Form.Dropdown>
      <Form.Dropdown id="task" title="Task" defaultValue="transcribe">
        <Form.Dropdown.Item value="transcribe" title="Transcribe" />
        <Form.Dropdown.Item value="translate" title="Translate to English" />
      </Form.Dropdown>
    </Form>
  );
}
