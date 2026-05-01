import { Action, ActionPanel, Clipboard, Detail, Form, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { AuthenticateView } from "./components/authenticate-view";
import { NoteDetailScreen } from "./components/note-detail";
import { getNoteDetail, saveLinkNote, waitForTask } from "./lib/api";
import { normalizeGetNoteError } from "./lib/errors";
import { NoteDetail as GetNoteDetail } from "./lib/types";
import { useGetNoteCredentials } from "./hooks/use-getnote-credentials";

type FormValues = {
  url: string;
};

function toHttpUrl(raw?: string): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();

  try {
    const parsedUrl = new URL(trimmed);

    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return parsedUrl.toString();
    }
  } catch {
    // Fall through to loose URL extraction.
  }

  const match = trimmed.match(/https?:\/\/[^\s"'<>]+/i);

  if (!match) {
    return null;
  }

  try {
    const parsedUrl = new URL(match[0]);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:" ? parsedUrl.toString() : null;
  } catch {
    return null;
  }
}

export default function SaveLinkCommand() {
  const { credentials, isLoading: isAuthLoading, reload } = useGetNoteCredentials();
  const [result, setResult] = useState<GetNoteDetail | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (isAuthLoading || !credentials || isSubmitting || status || result || url) {
      return;
    }

    let cancelled = false;

    async function prefillUrlFromClipboard() {
      try {
        const clipboardContent = await Clipboard.read();
        const clipboardUrl =
          toHttpUrl(clipboardContent.text) || toHttpUrl(clipboardContent.html) || toHttpUrl(await Clipboard.readText());

        if (!clipboardUrl || cancelled) {
          return;
        }

        setUrl((currentUrl) => currentUrl || clipboardUrl);
      } catch {
        // Ignore invalid clipboard content and keep the form empty.
      }
    }

    void prefillUrlFromClipboard();

    return () => {
      cancelled = true;
    };
  }, [credentials, isAuthLoading, isSubmitting, result, status, url]);

  async function handleSubmit(values: FormValues) {
    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating Link Note",
    });

    try {
      const task = await saveLinkNote(values.url.trim());
      setStatus("The link was submitted. GetNote is fetching the source and generating a summary...");

      const noteId = await waitForTask(task.task_id, {
        onTick(nextStatus) {
          setStatus(`Current task status: ${nextStatus}`);
          toast.message = nextStatus;
        },
      });

      const detail = await getNoteDetail(noteId);
      setResult(detail);

      toast.style = Toast.Style.Success;
      toast.title = "Link Note Created";
      toast.message = detail.title || noteId;
    } catch (error) {
      const message = normalizeGetNoteError(error);
      setStatus(message);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Save Link";
      toast.message = message;
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return <Detail isLoading markdown="Checking GetNote connection..." />;
  }

  if (!credentials) {
    return <AuthenticateView onConnected={reload} />;
  }

  if (result) {
    return <NoteDetailScreen noteId={result.note_id} initialNote={result} />;
  }

  if (isSubmitting || status) {
    return (
      <Detail
        isLoading={isSubmitting}
        markdown={`# Save Link to GetNote

${status || "Preparing..."}
`}
        actions={
          <ActionPanel>
            <Action title="Save Another Link" icon={Icon.Plus} onAction={() => setStatus(null)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="Save Link"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to GetNote" icon={Icon.Link} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        value={url}
        onChange={setUrl}
        placeholder="https://example.com/article"
        info="Defaults to the current clipboard URL when available. A public URL will be saved as a link note, and GetNote will fetch the source content and generate a summary in the background."
      />
    </Form>
  );
}
