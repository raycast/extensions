import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  popToRoot,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { useState } from "react";
import { executeSQL } from "@raycast/utils";
import { randomUUID } from "crypto";
import { getDbPath, dbExists, escapeSQL, writeSQL } from "./db";
import { DictionaryEntry } from "./types";

function formatDateForWispr(date: Date): string {
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  const y = date.getUTCFullYear();
  const mo = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  const ms = pad(date.getUTCMilliseconds(), 3);
  return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms} +00:00`;
}

export default function Command() {
  const dbPath = getDbPath();

  if (!dbExists()) {
    return (
      <Detail
        markdown={`## Wispr Flow Database Not Found\n\nCould not find the Wispr Flow database at:\n\n\`${dbPath}\`\n\nMake sure [Wispr Flow](https://wisprflow.ai) is installed and has been used at least once, or update the database path in the extension preferences.`}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  const [phraseError, setPhraseError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { phrase: string; replacement: string }) {
    const phrase = values.phrase.trim();
    const replacement = values.replacement?.trim();

    if (!phrase) {
      setPhraseError("Word or phrase is required");
      return;
    }

    setIsLoading(true);
    try {
      const existing = await executeSQL<DictionaryEntry>(
        dbPath,
        `SELECT id FROM Dictionary WHERE phrase = '${escapeSQL(phrase, 255)}' AND isDeleted = 0 LIMIT 1`,
      );

      if (existing.length > 0) {
        setPhraseError("This word already exists in your dictionary");
        setIsLoading(false);
        return;
      }

      const now = formatDateForWispr(new Date());
      const id = randomUUID();
      const escapedPhrase = escapeSQL(phrase, 255);
      const replacementValue = replacement
        ? `'${escapeSQL(replacement, 255)}'`
        : "NULL";
      const nullUUID = "00000000-0000-0000-0000-000000000000";

      writeSQL(
        `INSERT INTO Dictionary (id, phrase, replacement, teamDictionaryId, lastUsed, frequencyUsed, remoteFrequencyUsed, manualEntry, createdAt, modifiedAt, isDeleted, source, isSnippet, observedSource)
         VALUES ('${id}', '${escapedPhrase}', ${replacementValue}, '${nullUUID}', NULL, 0, 0, 1, '${now}', '${now}', 0, 'manual', 0, NULL)`,
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Word Added",
        message: `"${phrase}" added to Wispr Flow dictionary`,
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Word",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
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
          <Action.SubmitForm title="Add Word" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="phrase"
        title="Word or Phrase"
        placeholder="e.g., Anthropic, Claude, API"
        error={phraseError}
        onChange={() => {
          if (phraseError) setPhraseError(undefined);
        }}
      />
      <Form.TextField
        id="replacement"
        title="Replacement (Optional)"
        placeholder="Leave empty to use the word as-is"
        info="If set, Wispr Flow will substitute this text when the word is recognized"
      />
      <Form.Description text="Add a word or phrase that Wispr Flow should always recognize correctly. This is useful for names, technical terms, or custom vocabulary." />
    </Form>
  );
}
