import {
  Form,
  ActionPanel,
  SubmitFormAction,
  showToast,
  ToastStyle,
  OpenInBrowserAction,
  Icon,
  getSelectedText,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { Bookmark, addBookmark } from "./api";
import he from "he";

export default function Command() {
  const [state, setState] = useState<{ url: string; title: string }>({ url: "", title: "" });

  useEffect(() => {
    (async () => {
      try {
        const selectedText = await getSelectedText();
        console.log("selectedText", selectedText);
        if (!isValidURL(selectedText)) {
          console.log(selectedText, "is not a valid URL");
          return;
        }
        try {
          const documentTitle = await loadDocumentTitle(selectedText);
          setState((oldState) => ({ ...oldState, url: selectedText, title: documentTitle }));
        } catch (error) {
          console.error("Could not load document title", error);
          setState((oldState) => ({ ...oldState, url: selectedText }));
        }
      } catch (error) {
        console.error("Could not get selected text", error);
      }
    })();
  }, []);

  async function handleSubmit(values: Bookmark) {
    console.log("bookmark", values);
    const url = values.url.trim();
    const title = values.title.trim();
    if (!isValidURL(url) || title.length === 0) {
      showToast(ToastStyle.Failure, "Enter a valid URL and title for the bookmark");
      return;
    }
    showToast(ToastStyle.Animated, "Pinning bookmark...");
    try {
      await addBookmark(values);
      showToast(ToastStyle.Success, "Bookmark pinned!");
    } catch (error) {
      console.error("addBookmark error", error);
      showToast(ToastStyle.Failure, "Could not pin bookmark", String(error));
    }
  }

  function handleURLChange(value: string) {
    setState((oldState) => ({ ...oldState, url: value }));
  }

  function handleTitleChange(value: string) {
    setState((oldState) => ({ ...oldState, title: value }));
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Add Bookmark" icon={{ source: Icon.Plus }} onSubmit={handleSubmit} />
          <OpenInBrowserAction title="Open Pinboard" url="https://pinboard.in" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="Enter URL (Tip: Select a URL before opening this form)"
        value={state.url}
        onChange={handleURLChange}
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter title"
        value={state.title}
        onChange={handleTitleChange}
      />
      <Form.Separator />
      <Form.TextField id="tags" title="Tags" placeholder="Enter tags (comma-separated)" />
      <Form.Checkbox id="private" title="" label="Private" storeValue />
      <Form.Checkbox id="readLater" title="" label="Read Later" storeValue />
    </Form>
  );
}

async function loadDocumentTitle(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    return Promise.reject(response.statusText);
  }
  return extractDocumentTitle(await response.text());
}

function extractDocumentTitle(document: string): string {
  const title = document.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
  return he.decode(title);
}

function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}
