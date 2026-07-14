import {
  Action,
  ActionPanel,
  Detail,
  Form,
  LocalStorage,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";

const TAG_HISTORY_STORAGE_KEY = "flomoTagHistory";
const UNORDERED_LIST_MARKER = "- ";

type FormValues = {
  content: string;
  tag?: string;
};

function getNextOrderedListMarker(line: string): string | undefined {
  const match = line.match(/^(\s*)(\d+)\.\s+/);

  if (!match) {
    return undefined;
  }

  return `${match[1]}${Number(match[2]) + 1}. `;
}

function getUnorderedListMarker(line: string): string | undefined {
  const match = line.match(/^(\s*)[-*+]\s+/);

  if (!match) {
    return undefined;
  }

  return `${match[1]}${UNORDERED_LIST_MARKER}`;
}

function trimEmptyListMarker(content: string): string {
  return content.replace(/(^|\n)(\s*)(?:[-*+]|\d+\.)\s\n$/, "$1$2");
}

function continueListAfterTrailingNewline(previousContent: string, nextContent: string): string {
  if (!nextContent.endsWith("\n") || nextContent !== `${previousContent}\n`) {
    return nextContent;
  }

  const previousLines = previousContent.split("\n");
  const previousLine = previousLines.at(-1) ?? "";

  if (/^\s*(?:[-*+]|\d+\.)\s$/.test(previousLine)) {
    return trimEmptyListMarker(nextContent);
  }

  const nextMarker = getNextOrderedListMarker(previousLine) ?? getUnorderedListMarker(previousLine);

  if (!nextMarker) {
    return nextContent;
  }

  return `${nextContent}${nextMarker}`;
}

function normalizeApiUrl(api: string | undefined): string {
  return api?.trim() ?? "";
}

function isValidApiUrl(api: string): boolean {
  try {
    const url = new URL(api);

    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeTagValue(tag: string): string {
  return tag.trim().replace(/^#+/, "");
}

function parseTags(input: string | string[] | undefined): string[] {
  const rawTags = Array.isArray(input) ? input : (input ?? "").split(/\s+/);
  const tags = new Set<string>();

  rawTags.forEach((tag) => {
    const normalizedTag = normalizeTagValue(String(tag));

    if (normalizedTag) {
      tags.add(normalizedTag);
    }
  });

  return Array.from(tags);
}

function buildTagLine(tags: string[]): string {
  return tags.map((tag) => `#${tag}`).join(" ");
}

function buildContent(content: string, tags: string[]): string {
  const trimmedContent = content.trim();
  const tagLine = buildTagLine(tags);

  if (!tagLine) {
    return trimmedContent;
  }

  return `${trimmedContent}\n${tagLine}`;
}

function updateTagHistory(currentHistory: string[], newTags: string[]): string[] {
  return parseTags([...newTags, ...currentHistory]);
}

function parseTagHistory(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parseTags(parsedValue.map(String));
  } catch {
    return [];
  }
}

async function sendMemo(api: string, content: string): Promise<void> {
  const response = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      content_type: "markdown",
    }),
  });

  if (!response.ok) {
    throw new Error(`Flomo responded with HTTP ${response.status}`);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error("Flomo returned an unexpected response");
  }

  if (!payload || typeof payload !== "object" || !("code" in payload) || (payload as { code: unknown }).code !== 0) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
        ? (payload as { message: string }).message
        : "Flomo returned an unexpected response";

    throw new Error(message);
  }
}

export default function Command() {
  const preferenceApi = normalizeApiUrl(getPreferenceValues<Preferences.SendMemo>().api);
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("");
  const [selectedHistoryTags, setSelectedHistoryTags] = useState<string[]>([]);
  const [tagHistory, setTagHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const api = preferenceApi;

  useEffect(() => {
    async function loadSavedState() {
      const savedTagHistory = await LocalStorage.getItem<string>(TAG_HISTORY_STORAGE_KEY);

      setTagHistory(parseTagHistory(savedTagHistory));
    }

    loadSavedState();
  }, []);

  async function handleSubmit() {
    if (isLoading) {
      return false;
    }

    const normalizedApi = normalizeApiUrl(api);

    if (!isValidApiUrl(normalizedApi)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid API URL",
        message: "Use an HTTPS flomo MEMO API URL",
      });
      return false;
    }

    if (!content.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Write a memo before sending" });
      return false;
    }

    const nextTags = parseTags(tag);
    const nextContent = buildContent(content, nextTags);

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending memo to Flomo..." });

    try {
      await sendMemo(normalizedApi, nextContent);

      if (nextTags.length > 0) {
        const nextHistory = updateTagHistory(tagHistory, nextTags);

        setTagHistory(nextHistory);
        await LocalStorage.setItem(TAG_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      }

      setContent("");
      setTag("");
      setSelectedHistoryTags([]);

      toast.style = Toast.Style.Success;
      toast.title = "Memo sent to Flomo";
      toast.message = undefined;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send memo";
      toast.message = error instanceof Error ? error.message : String(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  function handleContentChange(nextContent: string) {
    setContent(continueListAfterTrailingNewline(content, nextContent));
  }

  function handleTagChange(nextTag: string) {
    const nextTags = parseTags(nextTag);
    const historySet = new Set(tagHistory);

    setTag(nextTag);
    setSelectedHistoryTags(nextTags.filter((parsedTag) => historySet.has(parsedTag)));
  }

  function handleHistoryTagsChange(nextSelectedHistoryTags: string[]) {
    const historySet = new Set(tagHistory);
    const manualTags = parseTags(tag).filter((currentTag) => !historySet.has(currentTag));
    const nextTags = parseTags([...manualTags, ...nextSelectedHistoryTags]);

    setSelectedHistoryTags(nextSelectedHistoryTags);
    setTag(nextTags.join(" "));
  }

  async function handleClearTagHistory() {
    await LocalStorage.removeItem(TAG_HISTORY_STORAGE_KEY);
    setTagHistory([]);
    setSelectedHistoryTags([]);
    await showToast({ style: Toast.Style.Success, title: "Tag history cleared" });
  }

  if (!api) {
    return (
      <Detail
        markdown="Set your Flomo MEMO API URL in the extension preferences before sending memos."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues> title="Send Memo" onSubmit={handleSubmit} />
          <Action title="Clear Tag History" style={Action.Style.Destructive} onAction={handleClearTagHistory} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="MEMO"
        placeholder="Write a memo..."
        info="Markdown syntax is supported, including bold text, unordered lists, and ordered lists."
        autoFocus
        enableMarkdown
        value={content}
        onChange={handleContentChange}
      />
      <Form.TextField
        id="tag"
        title="Tag"
        placeholder="Tags for flomo"
        info="Separate tags with spaces. Recently used tags can be selected from tag history."
        value={tag}
        onChange={handleTagChange}
      />
      {tagHistory.length > 0 ? (
        <Form.TagPicker
          id="tagHistory"
          title="Quick Tags"
          info="Historical tags can be quickly selected here."
          value={selectedHistoryTags}
          onChange={handleHistoryTagsChange}
        >
          {tagHistory.map((historyTag) => (
            <Form.TagPicker.Item key={historyTag} value={historyTag} title={`#${historyTag}`} />
          ))}
        </Form.TagPicker>
      ) : null}
    </Form>
  );
}
