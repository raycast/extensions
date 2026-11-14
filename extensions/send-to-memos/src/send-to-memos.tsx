import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getSelectedText,
  Icon,
  LaunchProps,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useRef, useState } from "react";
import {
  composeContent,
  createMemo,
  MemoInput,
  MemosError,
  normalizeServerUrl,
  normalizeSourceUrl,
  testConnection,
  Visibility,
} from "./lib/memos";
import { getPreferences } from "./lib/preferences";

export default function Command(props: LaunchProps<{ draftValues: MemoInput }>) {
  const preferences = getPreferences();
  const [values, setValues] = useState<MemoInput>({
    memo: props.draftValues?.memo ?? "",
    tags: props.draftValues?.tags ?? preferences.defaultTags ?? "",
    sourceUrl: props.draftValues?.sourceUrl ?? "",
    visibility: props.draftValues?.visibility ?? preferences.defaultVisibility ?? "PRIVATE",
  });
  const [memoError, setMemoError] = useState<string>();
  const [urlError, setUrlError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [lastMemoUrl, setLastMemoUrl] = useState<string>();
  const busy = useRef(false);

  function update<K extends keyof MemoInput>(key: K, value: MemoInput[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    if (key === "memo" || key === "sourceUrl") setMemoError(undefined);
    if (key === "sourceUrl") setUrlError(undefined);
  }

  async function submit(input: MemoInput, openInBrowser: boolean) {
    if (busy.current) return;
    if (!input.memo.trim() && !input.sourceUrl.trim()) {
      setMemoError("Write a memo or add a link.");
      return;
    }
    try {
      normalizeSourceUrl(input.sourceUrl);
    } catch (error) {
      setUrlError((error as Error).message);
      return;
    }
    busy.current = true;
    setIsLoading(true);
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending to Memos…" });
      const result = await createMemo(preferences, input);
      setLastMemoUrl(result.url);
      // Keep any edits made while the request was in flight.
      setValues((previous) => ({
        memo: previous.memo === input.memo ? "" : previous.memo,
        sourceUrl: previous.sourceUrl === input.sourceUrl ? "" : previous.sourceUrl,
        tags: previous.tags === input.tags ? (preferences.defaultTags ?? "") : previous.tags,
        visibility: previous.visibility,
      }));
      toast.style = Toast.Style.Success;
      toast.title = "Saved to Memos";
      toast.primaryAction = { title: "Open Memo", onAction: () => open(result.url) };
      if (openInBrowser || preferences.openAfterSend) {
        try {
          await open(result.url);
        } catch {
          toast.message = "The memo was saved. Use Open Last Memo to open it again.";
        }
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: error instanceof MemosError && error.uncertain ? "Check Memos Before Retrying" : "Could Not Send Memo",
        message:
          error instanceof MemosError
            ? error.message
            : "Your input has been kept. Check the connection before retrying.",
      });
    } finally {
      busy.current = false;
      setIsLoading(false);
    }
  }

  async function checkConnection() {
    if (busy.current) return;
    busy.current = true;
    setIsLoading(true);
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Checking Connection…" });
      await testConnection(preferences);
      toast.style = Toast.Style.Success;
      toast.title = "Connected to Memos";
      toast.message = "Your Memos instance is reachable.";
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Check Failed",
        message: error instanceof MemosError ? error.message : "Check extension preferences.",
      });
    } finally {
      busy.current = false;
      setIsLoading(false);
    }
  }

  async function insertText(read: () => Promise<string | undefined>) {
    try {
      const text = await read();
      if (!text?.trim()) {
        await showToast({ style: Toast.Style.Failure, title: "No Text to Insert" });
        return;
      }
      setValues((previous) => ({ ...previous, memo: [previous.memo, text].filter(Boolean).join("\n\n") }));
      setMemoError(undefined);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Read Text",
        message: "You can paste text directly into the memo.",
      });
    }
  }

  return (
    <Form
      navigationTitle="Send to Memos"
      enableDrafts
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send to Memos"
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onSubmit={(input: MemoInput) => submit(input, false)}
          />
          <Action.SubmitForm
            title="Send and Open"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onSubmit={(input: MemoInput) => submit(input, true)}
          />
          {lastMemoUrl && (
            <ActionPanel.Section title="Last Saved Memo">
              <Action.OpenInBrowser title="Open Last Memo" url={lastMemoUrl} />
              <Action.CopyToClipboard title="Copy Last Memo Link" content={lastMemoUrl} />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Input">
            <Action
              title="Insert Clipboard Text"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={() => insertText(() => Clipboard.readText())}
            />
            <Action title="Insert Selected Text" icon={Icon.Text} onAction={() => insertText(getSelectedText)} />
            <Action
              title="Copy Memo Content"
              icon={Icon.CopyClipboard}
              onAction={async () => {
                try {
                  await Clipboard.copy(composeContent(values));
                  await showToast({ style: Toast.Style.Success, title: "Copied" });
                } catch (error) {
                  await showToast({ style: Toast.Style.Failure, title: (error as Error).message });
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Settings">
            <Action title="Check Connection" icon={Icon.CheckCircle} onAction={checkConnection} />
            <Action
              title="Open Memos Website"
              icon={Icon.Globe}
              onAction={async () => {
                try {
                  await open(normalizeServerUrl(preferences.serverUrl));
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Could Not Open Memos",
                    message: error instanceof MemosError ? error.message : "Check extension preferences.",
                  });
                }
              }}
            />
            <Action title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="memo"
        title="MEMO"
        placeholder="What's on your mind? Markdown is welcome."
        value={values.memo}
        error={memoError}
        onChange={(value) => update("memo", value)}
        onBlur={() => {
          if (!values.memo.trim() && !values.sourceUrl.trim()) setMemoError("Write a memo or add a link.");
        }}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="#ideas #reading"
        info="Separate tags with spaces or commas. The # prefix is added automatically and duplicates are removed."
        value={values.tags}
        onChange={(value) => update("tags", value)}
      />
      <Form.TextField
        id="sourceUrl"
        title="Link"
        placeholder="https://… (optional)"
        info="An optional webpage URL to save alongside your thoughts."
        value={values.sourceUrl}
        error={urlError}
        onChange={(value) => update("sourceUrl", value)}
        onBlur={() => {
          try {
            normalizeSourceUrl(values.sourceUrl);
          } catch (error) {
            setUrlError((error as Error).message);
          }
        }}
      />
      <Form.Dropdown
        id="visibility"
        title="Visibility"
        value={values.visibility}
        onChange={(value) => update("visibility", value as Visibility)}
      >
        <Form.Dropdown.Item value="PRIVATE" title="Private" icon={Icon.Lock} />
        <Form.Dropdown.Item value="PROTECTED" title="Instance Members" icon={Icon.Person} />
        <Form.Dropdown.Item value="PUBLIC" title="Public" icon={Icon.Globe} />
      </Form.Dropdown>
    </Form>
  );
}
