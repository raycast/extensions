import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addBookmark, parseSessionUrl, updateBookmark, type Bookmark } from "./storage";

interface SessionFormProps {
  /** When provided, the form edits this bookmark instead of creating a new one. */
  bookmark?: Bookmark;
  /** Called after a successful save (e.g. to refresh a list). */
  onSaved?: () => void;
}

export function SessionForm({ bookmark, onSaved }: SessionFormProps) {
  const { pop } = useNavigation();
  const [urlError, setUrlError] = useState<string | undefined>();

  async function handleSubmit(values: { url: string; label: string; repo: string }) {
    if (!parseSessionUrl(values.url).valid) {
      setUrlError("Enter a Claude session link (https://claude.ai/code/…)");
      return;
    }
    try {
      if (bookmark) {
        await updateBookmark(bookmark.id, values);
      } else {
        await addBookmark(values);
      }
      await showToast({ style: Toast.Style.Success, title: bookmark ? "Session updated" : "Session saved" });
      onSaved?.();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save session",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={bookmark ? "Update Session" : "Save Session"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Session URL"
        placeholder="https://claude.ai/code/session_…"
        info="Copy this from the Claude Code terminal, the claude.ai/code session, or the QR link."
        defaultValue={bookmark?.url}
        error={urlError}
        onChange={() => urlError && setUrlError(undefined)}
      />
      <Form.TextField
        id="label"
        title="Label"
        placeholder="What is this session about?"
        defaultValue={bookmark?.label}
      />
      <Form.TextField id="repo" title="Repo (optional)" placeholder="owner/name" defaultValue={bookmark?.repo} />
    </Form>
  );
}
