import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
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
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      kind: "Ableton",
      status: "draft",
      location: [],
      previewSource: [],
      tags: "",
      notes: "",
    },
    validation: {
      title: (value) => (value?.trim() ? undefined : FormValidation.Required),
      previewSource: (value) => {
        const previewAudioPath = value?.[0]?.trim();

        if (!previewAudioPath) {
          return "Choose Preview Source to set preview.";
        }

        if (!inferMimeFromPath(previewAudioPath)) {
          return "Preview Source must be a supported audio file type.";
        }
      },
    },
    async onSubmit(values) {
      setIsLoading(true);

      try {
        const selectedLocation = values.location?.[0]?.trim();
        const previewAudioPath = values.previewSource[0].trim();
        const tags = values.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);

        const created = await createSession({
          title: values.title.trim(),
          kind: values.kind.trim() || "Ableton",
          status: values.status.trim() || undefined,
          projectPath: selectedLocation || undefined,
          previewAudioPath,
          previewAudioMime: inferMimeFromPath(previewAudioPath),
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
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Session" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Title"
        placeholder="Launch cue prep"
        {...itemProps.title}
      />
      <Form.Dropdown title="Kind" {...itemProps.kind}>
        {SESSION_KINDS.map((kind) => (
          <Form.Dropdown.Item key={kind} value={kind} title={kind} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Status" {...itemProps.status}>
        {SESSION_STATUSES.map((status) => (
          <Form.Dropdown.Item key={status} value={status} title={status} />
        ))}
      </Form.Dropdown>
      <Form.FilePicker
        title="Location"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles
        {...itemProps.location}
      />
      <Form.FilePicker
        title="Preview Source"
        info="Select the preview audio file to attach to the session."
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        {...itemProps.previewSource}
      />
      <Form.TextField
        title="Tags"
        placeholder="mix,priority"
        {...itemProps.tags}
      />
      <Form.TextArea
        title="Notes"
        placeholder="Session notes"
        {...itemProps.notes}
      />
    </Form>
  );
}
