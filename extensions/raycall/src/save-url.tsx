import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useRef, useState } from "react";
import { API_URL } from "./config";
import { Welcome, isConfigured } from "./welcome";

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export default function SaveUrl() {
  const prefs = getPreferenceValues<Preferences.SaveUrl>();
  if (!isConfigured(prefs)) return <Welcome reason="missing-token" />;
  return <SaveUrlForm apiToken={prefs.apiToken} />;
}

function SaveUrlForm({ apiToken }: { apiToken: string }) {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const urlFieldRef = useRef<Form.TextField>(null);

  async function submit(values: { url: string }) {
    const normalized = normalizeUrl(values.url);
    if (!normalized) {
      setUrlError("Enter a valid URL");
      return;
    }
    setUrlError(undefined);
    setSubmitting(true);

    const endpoint = `${API_URL}/api/bookmarks`;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving…",
      message: normalized,
    });

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ url: normalized }),
      });
      if (res.status === 401) {
        toast.style = Toast.Style.Failure;
        toast.title = "API token invalid";
        toast.message = "Run Change API Token to update it.";
        return;
      }
      if (res.status === 402) {
        toast.style = Toast.Style.Failure;
        toast.title = "Subscription required";
        toast.message = "Run Manage Subscription to start a trial or update billing.";
        return;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${body ? ` - ${body.slice(0, 200)}` : ""}`);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Saved - indexing in background";
      toast.message = normalized;
      setUrl("");
      urlFieldRef.current?.focus();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Save failed";
      const cause = (err as { cause?: { code?: string; message?: string } }).cause;
      const causeBit = cause?.code ? ` [${cause.code}]` : cause?.message ? ` - ${cause.message}` : "";
      toast.message = `${err instanceof Error ? err.message : String(err)}${causeBit} (${endpoint})`;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save URL" icon={Icon.Bookmark} onSubmit={submit} />
          <Action
            title="Change API Token"
            icon={Icon.Key}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={openExtensionPreferences}
          />
          <Action.OpenInBrowser
            title="Manage Subscription"
            icon={Icon.CreditCard}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            url={`${API_URL}/dashboard/billing`}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        ref={urlFieldRef}
        id="url"
        title="URL"
        placeholder="https://example.com"
        value={url}
        onChange={(value) => {
          setUrl(value);
          if (urlError) setUrlError(undefined);
        }}
        error={urlError}
        autoFocus
      />
      <Form.Description text="Raycall will fetch this page, extract the content, and embed it for semantic search." />
    </Form>
  );
}
