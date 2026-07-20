import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { createWebDownload, fetchHosters } from "./api/webdl";
import { Hoster } from "./api/types";

const isHttpUrl = (text: string): boolean => {
  const lower = text.toLowerCase();
  return lower.startsWith("http://") || lower.startsWith("https://");
};

const extractDomain = (url: string): string | null => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const isSupportedHoster = (url: string, hosters: Hoster[]): boolean => {
  const domain = extractDomain(url);
  if (!domain) return false;
  return hosters.some((h) => h.domains.some((d) => domain === d || domain.endsWith(`.${d}`)));
};

const fetchHostersSafe = async (): Promise<Hoster[] | null> => {
  try {
    return await fetchHosters();
  } catch {
    return null;
  }
};

export default function AddWebDownload() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [link, setLink] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [asQueued, setAsQueued] = useState(false);
  const [onlyIfCached, setOnlyIfCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const detectClipboardUrl = async () => {
      const text = await Clipboard.readText();
      if (!text) return;

      const trimmed = text.trim();
      if (!isHttpUrl(trimmed)) return;

      const hosters = await fetchHostersSafe();
      if (hosters && !isSupportedHoster(trimmed, hosters)) return;

      setLink(trimmed);
      await showToast({ style: Toast.Style.Success, title: "URL detected", message: "From clipboard" });
    };

    detectClipboardUrl();
  }, []);

  const handleSubmit = async () => {
    if (!link.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Missing URL", message: "Provide a download URL" });
      return;
    }

    if (!isHttpUrl(link)) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid URL", message: "Must be http:// or https://" });
      return;
    }

    setIsLoading(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding web download..." });

      await createWebDownload(preferences.apiKey, {
        link: link.trim(),
        password: password.trim() || undefined,
        name: name.trim() || undefined,
        asQueued,
        onlyIfCached,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Web download added",
        message: name.trim() || link.trim().substring(0, 50),
      });

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add download",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Web Download" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="link" title="URL" placeholder="https://..." value={link} onChange={setLink} />

      <Form.TextField id="password" title="Password" placeholder="Optional" value={password} onChange={setPassword} />

      <Form.Separator />

      <Form.TextField id="name" title="Custom Name" placeholder="Optional" value={name} onChange={setName} />

      <Form.Checkbox id="asQueued" label="Add to queue" value={asQueued} onChange={setAsQueued} />

      <Form.Checkbox id="onlyIfCached" label="Only if cached" value={onlyIfCached} onChange={setOnlyIfCached} />
    </Form>
  );
}
