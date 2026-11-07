import { Action, ActionPanel, Clipboard, Form, Toast, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import ConnectAccount from "./connect-account";
import { getWebCullPreferences } from "./lib/preferences";
import { WebCullAuthError } from "./lib/http";
import { getCapabilityState, getStacks, saveBookmark } from "./lib/webcullClient";
import { WebCullCapabilityState, WebCullStack } from "./types";

type FormValues = {
  url: string;
  title?: string;
  parentStackId: string;
};

export default function SaveUrlToStack() {
  const preferences = getWebCullPreferences();
  const [stacks, setStacks] = useState<WebCullStack[]>([]);
  const [capabilities, setCapabilities] = useState<WebCullCapabilityState | null>(null);
  const [clipboardUrl, setClipboardUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupAttempt, setSetupAttempt] = useState(0);
  const [needsReauth, setNeedsReauth] = useState(false);
  const urlEdited = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setSetupError(null);
      setNeedsReauth(false);
      setCapabilities(null);
      setStacks([]);
      try {
        const [nextCapabilities, nextClipboardText] = await Promise.all([
          getCapabilityState(),
          setupAttempt === 0 ? Clipboard.readText() : Promise.resolve(undefined),
        ]);
        if (cancelled) return;

        if (setupAttempt === 0 && !urlEdited.current) {
          setClipboardUrl(String(nextClipboardText || ""));
        }

        let nextStacks: WebCullStack[] = [];
        if (nextCapabilities.bookmarkWrite && nextCapabilities.accountId) {
          nextStacks = await getStacks(preferences, nextCapabilities.accountId);
        }
        if (cancelled) return;
        setStacks(nextStacks);
        setCapabilities(nextCapabilities);
      } catch (error) {
        if (cancelled) return;
        setSetupError(error instanceof Error ? error.message : "Unknown error");
        setNeedsReauth(error instanceof WebCullAuthError);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load WebCull stacks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [setupAttempt]);

  async function handleSubmit(values: FormValues) {
    if (isLoading || setupError || !capabilities) return;
    if (!capabilities?.bookmarkWrite || !capabilities.accountId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "WebCull save is unavailable",
        message: capabilities?.reason || "Save is not enabled for this account.",
      });
      return;
    }

    const url = values.url.trim();

    if (!url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a URL",
      });
      return;
    }

    if (isLoading || !values.parentStackId) return;
    setIsLoading(true);
    try {
      await saveBookmark(preferences, {
        accountId: capabilities.accountId,
        parentStackId: values.parentStackId,
        url,
        title: values.title?.trim() || url,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Saved to WebCull",
      });
    } catch (error) {
      if (error instanceof WebCullAuthError) {
        setNeedsReauth(true);
        setSetupError(error.message);
        setCapabilities(null);
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save to WebCull",
        message: error instanceof Error ? error.message : "Unknown error",
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
          {needsReauth || capabilities?.needsAuth ? (
            <Action.Push
              title="Reconnect WebCull"
              target={
                <ConnectAccount
                  reauthorize
                  onConnected={() => setSetupAttempt((attempt) => attempt + 1)}
                />
              }
            />
          ) : setupError ? (
            <Action title="Retry" onAction={() => setSetupAttempt((attempt) => attempt + 1)} />
          ) : capabilities?.bookmarkWrite && !isLoading ? (
            <Action.SubmitForm title="Save Bookmark" onSubmit={handleSubmit} />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        value={clipboardUrl}
        onChange={(value) => {
          urlEdited.current = true;
          setClipboardUrl(value);
        }}
      />
      <Form.TextField id="title" title="Title" placeholder="Optional title" />
      <Form.Dropdown id="parentStackId" title="Stack">
        {stacks.map((stack) => (
          <Form.Dropdown.Item key={stack.id} value={stack.id} title={stack.path} />
        ))}
      </Form.Dropdown>
      {setupError ? (
        <Form.Description title="Could not load WebCull stacks" text={setupError} />
      ) : capabilities && !capabilities.bookmarkWrite ? (
        <Form.Description
          title="Status"
          text={capabilities.reason || "Saving is not enabled for this account."}
        />
      ) : null}
    </Form>
  );
}
