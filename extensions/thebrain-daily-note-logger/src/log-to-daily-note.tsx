import {
  Form,
  ActionPanel,
  Action,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useState } from "react";
import { BrainClient, BrainError, buildUpdatedNote } from "./brain-client";
import { todayStrings, currentTimestamp } from "./date-utils";

interface Preferences {
  apiKey: string;
  baseUrl: string;
}

const ROOT_NAME = "Daily Notes";

export default function LogToDailyNote() {
  const [isLoading, setIsLoading] = useState(false);
  const [entryError, setEntryError] = useState<string | undefined>(undefined);

  async function handleSubmit(values: { entry: string }) {
    const text = values.entry.trim();
    if (!text) {
      setEntryError("Entry cannot be blank");
      return;
    }
    setEntryError(undefined);

    const now = new Date();
    setIsLoading(true);
    try {
      const prefs = getPreferenceValues<Preferences>();
      const client = new BrainClient(
        prefs.baseUrl || "http://localhost:8001",
        prefs.apiKey,
      );

      const state = await client.getState();
      if (!state?.currentBrainId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Brain Open",
          message: "Open a brain in TheBrain first",
        });
        return;
      }
      client.brainId = state.currentBrainId;

      const { year, month, day } = todayStrings(now);

      const root = await client.getThoughtByName(ROOT_NAME);
      if (!root) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Daily Note Not Found",
          message: "Run daily_note.py first",
        });
        return;
      }

      const yearThought = (await client.getChildren(root.id)).find(
        (c) => c.name === year,
      );
      if (!yearThought) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Daily Note Not Found",
          message: `"${year}" not found — run daily_note.py first`,
        });
        return;
      }

      const monthThought = (await client.getChildren(yearThought.id)).find(
        (c) => c.name === month,
      );
      if (!monthThought) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Daily Note Not Found",
          message: `"${month}" not found — run daily_note.py first`,
        });
        return;
      }

      const dayThought = (await client.getChildren(monthThought.id)).find(
        (c) => c.name === day,
      );
      if (!dayThought) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Daily Note Not Found",
          message: `"${day}" not found — run daily_note.py first`,
        });
        return;
      }

      const timestamp = currentTimestamp(now);
      const existingHtml = await client.getNote(dayThought.id);
      const updatedHtml = buildUpdatedNote(existingHtml, timestamp, text);
      await client.saveNote(dayThought.id, updatedHtml);

      await showHUD(`Logged: ${timestamp} ${text}`);
    } catch (e) {
      const message = e instanceof BrainError ? e.message : String(e);
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="entry"
        title=""
        placeholder="Log entry…"
        autoFocus
        error={entryError}
        onChange={(v) => {
          if (v.trim()) setEntryError(undefined);
        }}
      />
    </Form>
  );
}
