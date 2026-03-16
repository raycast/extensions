import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { createSession } from "./api";

const SESSION_KINDS = [
  "Ableton",
  "Logic",
  "FL Studio",
  "Reaper",
  "Folder",
  "Audio Files",
  "Pro Tools",
  "Studio One",
  "Bitwig",
  "Cubase",
] as const;

const SESSION_STATUSES = ["draft", "in-progress", "ready", "archived"] as const;

type FormValues = {
  title: string;
  kind: string;
  status: string;
  location: string[];
  previewSource: string[];
  tags: string;
  notes: string;
};

function inferMimeFromPath(path: string): string | undefined {
  const lower = path.toLowerCase();

  if (lower.endsWith(".wav")) {
    return "audio/wav";
  }
  if (lower.endsWith(".mp3")) {
    return "audio/mpeg";
  }
  if (lower.endsWith(".aif") || lower.endsWith(".aiff")) {
    return "audio/aiff";
  }
  if (lower.endsWith(".m4a")) {
    return "audio/mp4";
  }
  if (lower.endsWith(".flac")) {
    return "audio/flac";
  }
  if (lower.endsWith(".ogg")) {
    return "audio/ogg";
  }

  return undefined;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      const selectedLocation = values.location?.[0]?.trim();
      const selectedPreviewSource = values.previewSource?.[0]?.trim();
      const tags = values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const normalizedTitle = values.title.trim();
      const normalizedKind = values.kind.trim() || "Ableton";
      const previewAudioPath = selectedPreviewSource || undefined;
      const previewAudioMime = previewAudioPath
        ? inferMimeFromPath(previewAudioPath)
        : undefined;

      if (!normalizedTitle) {
        throw new Error("Title is required.");
      }

      if (!previewAudioPath) {
        throw new Error("Choose Preview Source to set preview.");
      }

      if (!previewAudioMime) {
        throw new Error("Preview Source must be a supported audio file type.");
      }

      const created = await createSession({
        title: normalizedTitle,
        kind: normalizedKind,
        status: values.status.trim() || undefined,
        projectPath: selectedLocation || undefined,
        previewAudioPath,
        previewAudioMime,
        tags: tags.length ? tags : undefined,
        notes: values.notes.trim() || undefined,
      });

      await showToast({
        style: Toast.Style.Success,
        title: `Created ${created.title} with preview`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title:
          error instanceof Error ? error.message : "Failed to create session",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Session" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Launch cue prep" />
      <Form.Dropdown id="kind" title="Kind" defaultValue="Ableton">
        {SESSION_KINDS.map((kind) => (
          <Form.Dropdown.Item key={kind} value={kind} title={kind} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="status" title="Status" defaultValue="draft">
        {SESSION_STATUSES.map((status) => (
          <Form.Dropdown.Item key={status} value={status} title={status} />
        ))}
      </Form.Dropdown>
      <Form.FilePicker
        id="location"
        title="Location"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles
      />
      <Form.FilePicker
        id="previewSource"
        title="Preview Source"
        info="Select the preview audio file to attach to the session."
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
      <Form.TextField id="tags" title="Tags" placeholder="mix,priority" />
      <Form.TextArea id="notes" title="Notes" placeholder="Session notes" />
    </Form>
  );
}
