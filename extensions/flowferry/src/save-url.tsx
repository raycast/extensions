import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { InvalidApiKeyError, postArticle } from "./lib/api";
import { extractFromHtml } from "./lib/extractor";
import { fetchHtml } from "./lib/fetchUrl";
import { getPreferences } from "./lib/preferences";

interface SaveUrlFormValues {
  url: string;
  title?: string;
}

const looksLikeUrl = (value: string): boolean => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

export default function SaveUrl() {
  const [url, setUrl] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [urlError, setUrlError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill URL from clipboard when it looks like a URL.
  useEffect(() => {
    let cancelled = false;
    Clipboard.read()
      .then((clip) => {
        if (cancelled) return;
        const text = clip?.text?.trim();
        if (text && looksLikeUrl(text)) {
          setUrl(text);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (values: SaveUrlFormValues) => {
    const trimmedUrl = values.url.trim();
    if (!looksLikeUrl(trimmedUrl)) {
      setUrlError("Enter a valid http(s) URL.");
      return;
    }
    setUrlError(undefined);

    const { apiKey } = getPreferences();
    if (!apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API key required",
        message: "Set it in FlowFerry extension preferences.",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving to FlowFerry…",
    });

    try {
      const html = await fetchHtml(trimmedUrl);
      const article = await extractFromHtml(html, trimmedUrl);

      const articleTitle = values.title?.trim() || article.title;
      await postArticle(apiKey, {
        title: articleTitle,
        // The FlowFerry reader expects the title as a leading h1 inside the body
        // (same convention as the browser extension's save flow).
        content: `# ${articleTitle}\n\n${article.content}`,
        url: trimmedUrl,
        description: article.excerpt,
        cover: article.leadImageUrl,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Saved to FlowFerry";
      toast.message = articleTitle;
      await popToRoot({ clearSearchBar: true });
    } catch (e) {
      if (e instanceof InvalidApiKeyError) {
        toast.style = Toast.Style.Failure;
        toast.title = "Invalid API key";
        toast.message = "Update it in extension preferences.";
        toast.primaryAction = {
          title: "Open Preferences",
          onAction: () => openExtensionPreferences(),
        };
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't save";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          {/* "FlowFerry" is the brand name — the title-case rule misreads the camel case. */}
          {/* eslint-disable-next-line @raycast/prefer-title-case */}
          <Action.SubmitForm title="Save to FlowFerry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/article"
        value={url}
        onChange={(value) => {
          setUrl(value);
          if (urlError) setUrlError(undefined);
        }}
        error={urlError}
        autoFocus
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Override the parsed title (optional)"
        value={title}
        onChange={setTitle}
      />
    </Form>
  );
}
