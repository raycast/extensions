import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { saveBookmark, updateBookmark } from "./keep";

export default function Command() {
  const { pop } = useNavigation();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const urlEdited = useRef(false);
  const urlRef = useRef("");
  const urlRevision = useRef(0);
  const savingUrls = useRef(new Set<string>());
  const savedIds = useRef(new Map<string, string>());

  useEffect(() => {
    Clipboard.readText()
      .then((text) => {
        if (!urlEdited.current && text && /^https?:\/\//i.test(text.trim())) {
          urlRef.current = text.trim();
          setUrl(text.trim());
        }
      })
      .catch(() => undefined);
  }, []);

  async function submit() {
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
      if (!["http:", "https:"].includes(parsed.protocol))
        throw new Error("Unsupported URL scheme");
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter a valid HTTP or HTTPS URL",
      });
      return;
    }
    const metadata = {
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(tags.trim()
        ? {
            tags: [
              ...new Set(
                tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              ),
            ],
          }
        : {}),
    };
    const targetUrl = parsed.toString();
    if (savingUrls.current.has(targetUrl)) {
      await showToast({
        style: Toast.Style.Animated,
        title: "This bookmark is already being saved",
        message: targetUrl,
      });
      return;
    }
    const revision = urlRevision.current;
    const isCurrent = () => revision === urlRevision.current;
    savingUrls.current.add(targetUrl);
    setSaving(true);
    try {
      const existingId = savedIds.current.get(targetUrl);
      const saved = existingId
        ? { id: existingId }
        : await saveBookmark(targetUrl);
      savedIds.current.set(targetUrl, saved.id);
      if (Object.keys(metadata).length > 0) {
        try {
          await updateBookmark(saved.id, metadata);
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Bookmark saved, but details were not updated",
            message: `${targetUrl}: ${String(error)}`,
          });
          return;
        }
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Saved to Keep.md",
        message: targetUrl,
      });
      if (isCurrent()) pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save bookmark",
        message: `${targetUrl}: ${String(error)}`,
      });
    } finally {
      savingUrls.current.delete(targetUrl);
      setSaving(savingUrls.current.size > 0);
    }
  }

  return (
    <Form
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Keep.md" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/article"
        value={url}
        onChange={(value) => {
          urlEdited.current = true;
          if (value !== urlRef.current) {
            urlRevision.current += 1;
          }
          urlRef.current = value;
          setUrl(value);
        }}
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Optional title"
        value={title}
        onChange={setTitle}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="Optional tags"
        info="Separate tags with commas."
        value={tags}
        onChange={setTags}
      />
    </Form>
  );
}
