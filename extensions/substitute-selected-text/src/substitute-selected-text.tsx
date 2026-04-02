import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  getSelectedText,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";

import { checkGsedAvailability, runGsedSubstitution } from "./lib/gsed";
import { parseSubstituteRule } from "./lib/rule-parser";
import { pasteTextToFrontmostApp } from "./lib/paste";
import {
  clearHistoryEntries,
  listHistory,
  recordHistoryAttempt,
  removeHistoryEntry,
} from "./lib/storage";
import type { HistoryItem } from "./types";

type Preferences = {
  historyLimit?: string;
};

const PREVIEW_DEBOUNCE_MS = 700;

function normalizeHistoryLimit(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "10", 10);
  if (Number.isNaN(parsed)) {
    return 10;
  }

  return Math.max(parsed, 0);
}

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function truncateForForm(text: string, limit = 600): string {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit)}...`;
}

function formatPreviewError(errorMessage: string, limit = 120): string {
  const firstLine = errorMessage
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  const compact = (firstLine ?? errorMessage).replace(/\s+/gu, " ").trim();
  if (compact.length <= limit) {
    return compact;
  }

  return `${compact.slice(0, limit)}...`;
}

export default function Command(): JSX.Element | null {
  const preferences = getPreferenceValues<Preferences>();
  const historyLimit = useMemo(
    () => normalizeHistoryLimit(preferences.historyLimit),
    [preferences.historyLimit],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [hasFatalError, setHasFatalError] = useState(false);

  const [originalText, setOriginalText] = useState("");
  const [rule, setRule] = useState("");
  const [preview, setPreview] = useState("");
  const [previewError, setPreviewError] = useState<string | undefined>();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedRecentId, setSelectedRecentId] = useState<string>("");
  const [recentPickerValue, setRecentPickerValue] = useState<string>("");

  const [isApplying, setIsApplying] = useState(false);
  const previewSequence = useRef(0);

  const selectedRecent = history.find((item) => item.id === selectedRecentId);

  useEffect(() => {
    async function initialize(): Promise<void> {
      const hasGsed = await checkGsedAvailability();
      if (!hasGsed) {
        await showToast({
          style: Toast.Style.Failure,
          title: "GNU sed is required",
          message: "Install it with: brew install gnu-sed",
        });
        setHasFatalError(true);
        setIsLoading(false);
        return;
      }

      try {
        const selectedText = await getSelectedText();
        setOriginalText(selectedText);
        setPreview(selectedText);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No selected text found",
          message: messageOf(error),
        });
        setHasFatalError(true);
        setIsLoading(false);
        return;
      }

      const storedHistory = await listHistory();
      setHistory(storedHistory);
      setSelectedRecentId(storedHistory[0]?.id ?? "");
      setRecentPickerValue("");

      setIsLoading(false);
    }

    void initialize();
  }, []);

  useEffect(() => {
    if (isLoading || hasFatalError) {
      return;
    }

    const timer = setTimeout(() => {
      const sequenceId = previewSequence.current + 1;
      previewSequence.current = sequenceId;

      const trimmedRule = rule.trim();
      if (!trimmedRule) {
        setPreview(originalText);
        setPreviewError(undefined);
        return;
      }

      void (async () => {
        try {
          const parsed = parseSubstituteRule(trimmedRule);
          const output = await runGsedSubstitution(
            parsed.sedExpression,
            originalText,
          );
          if (previewSequence.current === sequenceId) {
            setPreview(output);
            setPreviewError(undefined);
          }
        } catch (error) {
          if (previewSequence.current === sequenceId) {
            setPreview("");
            setPreviewError(messageOf(error));
          }
        }
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [hasFatalError, isLoading, originalText, rule]);

  if (hasFatalError) {
    return null;
  }

  async function refreshHistory(nextHistory?: HistoryItem[]): Promise<void> {
    const latest = nextHistory ?? (await listHistory());
    setHistory(latest);

    if (latest.some((item) => item.id === selectedRecentId)) {
      return;
    }

    setSelectedRecentId(latest[0]?.id ?? "");
  }

  async function applyReplacement(): Promise<void> {
    const trimmedRule = rule.trim();
    if (!trimmedRule) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rule cannot be empty",
      });
      return;
    }

    setIsApplying(true);

    try {
      const updatedHistory = await recordHistoryAttempt(
        trimmedRule,
        historyLimit,
      );
      await refreshHistory(updatedHistory);

      const parsed = parseSubstituteRule(trimmedRule);
      const transformed = await runGsedSubstitution(
        parsed.sedExpression,
        originalText,
      );
      await pasteTextToFrontmostApp(
        transformed,
        Clipboard.paste,
        closeMainWindow,
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Replacement applied",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Replacement failed",
        message: messageOf(error),
      });
    } finally {
      setIsApplying(false);
    }
  }

  async function deleteSelectedRecent(): Promise<void> {
    if (!selectedRecent) {
      return;
    }

    const updated = await removeHistoryEntry(selectedRecent.id);
    await refreshHistory(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Recent rule deleted",
    });
  }

  async function clearRecents(): Promise<void> {
    const updated = await clearHistoryEntries();
    await refreshHistory(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Recent history cleared",
    });
  }

  const previewText = previewError
    ? `Error: ${formatPreviewError(previewError)}`
    : preview || "(empty output)";

  return (
    <Form
      isLoading={isLoading || isApplying}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Apply Replacement"
              icon={Icon.Checkmark}
              shortcut={{ modifiers: [], key: "return" }}
              onAction={() => {
                void applyReplacement();
              }}
            />
            <Action
              title="Apply Replacement (cmd+return)"
              icon={Icon.Checkmark}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={() => {
                void applyReplacement();
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Recents">
            <Action
              title="Use Selected Recent"
              icon={Icon.ArrowRight}
              onAction={() => {
                if (selectedRecent) {
                  setRule(selectedRecent.rawInput);
                }
              }}
              disabled={!selectedRecent}
            />
            <Action
              title="Delete Selected Recent"
              icon={Icon.Trash}
              onAction={() => {
                void deleteSelectedRecent();
              }}
              disabled={!selectedRecent}
            />
            <Action
              title="Clear Recent History"
              icon={Icon.XMarkCircle}
              onAction={() => {
                void clearRecents();
              }}
              disabled={history.length === 0}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="rule"
        title="Rule"
        value={rule}
        placeholder="/foo/bar/g or #foo#bar#g"
        onChange={(value) => {
          setRule(value);
          setPreviewError(undefined);
        }}
      />
      <Form.Description title="Original" text={truncateForForm(originalText)} />
      <Form.Description title="Preview" text={truncateForForm(previewText)} />

      <Form.Separator />

      <Form.Dropdown
        id="recents"
        title="Recents"
        value={recentPickerValue}
        onChange={(value) => {
          setRecentPickerValue(value);
          const selected = history.find((item) => item.id === value);
          if (selected) {
            setSelectedRecentId(selected.id);
            setRule(selected.rawInput);
            setRecentPickerValue("");
          }
          setPreviewError(undefined);
        }}
      >
        {history.length === 0 ? (
          <Form.Dropdown.Item value="" title="No recent rules" />
        ) : (
          <>
            <Form.Dropdown.Item value="" title="Select a recent rule" />
            {history.map((item) => (
              <Form.Dropdown.Item
                key={item.id}
                value={item.id}
                title={item.rawInput}
              />
            ))}
          </>
        )}
      </Form.Dropdown>
    </Form>
  );
}
