import { Action, ActionPanel, Clipboard, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { glimpse } from "./glimpse";

const AUDIO = ["wav", "mp3", "m4a", "aac", "ogg", "flac"];
const VIDEO = ["mp4", "mov", "webm", "mkv"];
const SUPPORTED = [...AUDIO, ...VIDEO];

interface Values {
  files: string[];
  action: string;
}

export default function Command() {
  const [loading, setLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const file = values.files[0];
      setLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Transcribing…" });
      try {
        if (values.action === "import") {
          await importWithProgress(file, toast);
        } else {
          const res = await glimpse<{ files: { text: string }[] }>(["transcribe", file, "--stdout"]);
          await Clipboard.copy(res.files?.[0]?.text ?? "");
          toast.style = Toast.Style.Success;
          toast.title = "Transcript copied";
        }
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Glimpse";
        toast.message = (error as Error).message;
      } finally {
        setLoading(false);
      }
    },
    validation: {
      // The native file picker can't be type-filtered, so reject unsupported
      // selections here instead.
      files: (value) => {
        if (!value || value.length === 0) return "Choose an audio or video file.";
        if (!SUPPORTED.includes(extensionOf(value[0]))) return "Choose a supported file.";
        return undefined;
      },
    },
  });

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Microphone} title="Transcribe" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker title="Audio or Video" allowMultipleSelection={false} {...itemProps.files} />
      <Form.Dropdown title="Result" {...itemProps.action}>
        <Form.Dropdown.Item value="copy" title="Copy to Clipboard" icon={Icon.Clipboard} />
        <Form.Dropdown.Item value="import" title="Add to Library" icon={Icon.Tray} />
      </Form.Dropdown>
    </Form>
  );
}

function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Import returns a job id immediately; poll its status and surface the progress.
async function importWithProgress(file: string, toast: Toast) {
  const res = await glimpse<{ jobs: { id: string }[] }>(["library", "import", file]);
  const id = res.jobs?.[0]?.id;
  if (!id) throw new Error("Import did not start");

  let status = "pending";
  let progress = 0;
  let polls = 0;
  while (status !== "complete") {
    if (polls++ > 3600) throw new Error("Import timed out");
    const st = await glimpse<{ items: { status: string; progress: number }[] }>(["library", "status", id]);
    const item = st.items?.[0];
    status = item?.status ?? status;
    progress = item?.progress ?? progress;
    if (status === "error" || status === "cancelled") throw new Error(`Import ${status}`);
    if (status !== "complete") {
      toast.message = `${Math.round(progress * 100)}%`;
      await delay(1000);
    }
  }
  toast.style = Toast.Style.Success;
  toast.title = "Added to Library";
  toast.message = undefined;
}
