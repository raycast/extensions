import { Action, ActionPanel, Clipboard, Form, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import ConnectAccount from "./connect-account";
import { getWebCullPreferences } from "./lib/preferences";
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

  useEffect(() => {
    async function load() {
      try {
        const [nextCapabilities, nextClipboardText] = await Promise.all([
          getCapabilityState(),
          Clipboard.readText(),
        ]);

        setCapabilities(nextCapabilities);
        setClipboardUrl(String(nextClipboardText || ""));

        if (nextCapabilities.bookmarkWrite) {
          setStacks(await getStacks(preferences));
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load WebCull stacks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  async function handleSubmit(values: FormValues) {
    if (!capabilities?.bookmarkWrite) {
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
        parentStackId: values.parentStackId,
        url,
        title: values.title?.trim() || url,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Saved to WebCull",
      });
    } catch (error) {
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
          {capabilities?.needsAuth ? (
            <Action.Push title="Manage WebCull Account" target={<ConnectAccount />} />
          ) : (
            <Action.SubmitForm title="Save Bookmark" onSubmit={handleSubmit} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        value={clipboardUrl}
        onChange={setClipboardUrl}
      />
      <Form.TextField id="title" title="Title" placeholder="Optional title" />
      <Form.Dropdown id="parentStackId" title="Stack">
        {stacks.map((stack) => (
          <Form.Dropdown.Item key={stack.id} value={stack.id} title={stack.path} />
        ))}
      </Form.Dropdown>
      {capabilities && !capabilities.bookmarkWrite ? (
        <Form.Description
          title="Status"
          text={capabilities.reason || "Saving is not enabled for this account."}
        />
      ) : null}
    </Form>
  );
}
