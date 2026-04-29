import {
  Action,
  ActionPanel,
  BrowserExtension,
  Clipboard,
  Form,
  getSelectedFinderItems,
  getSelectedText,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { readFile, stat } from "fs/promises";
import { basename } from "path";
import { useEffect, useState } from "react";
import { createObject, createObjectFromBlob, MyMindApiError } from "./api";

interface FormValues {
  text: string;
  files: string[];
  title: string;
  tags: string;
}

const MAX_BLOB_BYTES = 64 * 1024 * 1024;

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function parseTags(raw: string): string[] | undefined {
  if (!raw.trim()) return undefined;
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length ? tags : undefined;
}

function guessContentType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  if (!ext) return "application/octet-stream";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    md: "text/markdown",
    txt: "text/plain",
    json: "application/json",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    mov: "video/quicktime",
  };
  return map[ext] ?? "application/octet-stream";
}

async function detectActiveBrowserTab(): Promise<{ url?: string; title?: string } | null> {
  try {
    const tabs = await BrowserExtension.getTabs();
    return tabs.find((t) => t.active) ?? null;
  } catch {
    return null;
  }
}

export default function Command() {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [detected, setDetected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [finderRes, selectedRes, tabRes, clipRes] = await Promise.allSettled([
        getSelectedFinderItems(),
        getSelectedText(),
        detectActiveBrowserTab(),
        Clipboard.readText(),
      ]);
      if (cancelled) return;

      const finderItems = finderRes.status === "fulfilled" ? finderRes.value : [];
      const rawSelected = selectedRes.status === "fulfilled" ? selectedRes.value?.trim() : "";
      const tab = tabRes.status === "fulfilled" ? tabRes.value : null;
      const clip = clipRes.status === "fulfilled" ? clipRes.value?.trim() : "";

      // Browsers sometimes return the entire focused element's contents when
      // nothing is explicitly selected. Treat overly long values as garbage —
      // a real text selection a user would intentionally save is a quote, not
      // a full page dump.
      const SELECTION_MAX_CHARS = 5000;
      const selected = rawSelected && rawSelected.length <= SELECTION_MAX_CHARS ? rawSelected : "";

      // Priority: Finder selection -> selected text -> frontmost browser tab -> clipboard URL.
      if (finderItems.length > 0) {
        const paths = finderItems.map((i) => i.path);
        setFiles((prev) => (prev.length === 0 ? paths : prev));
        setDetected(`Detected: ${paths.length} file${paths.length === 1 ? "" : "s"} in Finder`);
        return;
      }
      if (selected) {
        setText((prev) => prev || selected);
        setDetected("Detected: selected text");
        return;
      }
      if (tab?.url) {
        setText((prev) => prev || tab.url || "");
        if (tab.title) setTitle((prev) => prev || tab.title || "");
        setDetected(`Detected: active tab — ${tab.title ?? tab.url}`);
        return;
      }
      if (clip && looksLikeUrl(clip)) {
        setText((prev) => prev || clip);
        setDetected("Detected: URL from clipboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (values: FormValues) => {
    const tags = parseTags(values.tags);
    const title = values.title.trim() || undefined;

    if (values.files.length > 0) {
      await uploadFiles(values.files, { title, tags });
      return;
    }

    const trimmed = values.text.trim();
    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing to save" });
      return;
    }

    if (looksLikeUrl(trimmed)) {
      await save(() => createObject({ kind: "url", url: trimmed, title, tags }));
    } else {
      await save(() => createObject({ kind: "note", markdown: values.text, title, tags }));
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={detected ?? "Paste a URL, write markdown, or pick a file. Auto-detects what to do."} />
      <Form.TextArea
        id="text"
        title="URL or Note"
        placeholder="https://example.com — or write a markdown note here"
        value={text}
        onChange={setText}
        enableMarkdown
      />
      <Form.FilePicker
        id="files"
        title="Files"
        allowMultipleSelection
        canChooseDirectories={false}
        value={files}
        onChange={setFiles}
      />
      <Form.TextField id="title" title="Title" placeholder="Optional" value={title} onChange={setTitle} />
      <Form.TextField id="tags" title="Tags" placeholder="Comma-separated, optional" />
    </Form>
  );
}

async function save(operation: () => Promise<unknown>) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving…" });
  try {
    await operation();
    toast.style = Toast.Style.Success;
    toast.title = "Saved to mymind";
    await popToRoot();
  } catch (error) {
    toast.hide();
    if (error instanceof MyMindApiError && error.isUnauthorized) {
      await showFailureToast(error, { title: "Authentication required" });
    } else {
      await showFailureToast(error, { title: "Failed to save" });
    }
  }
}

async function uploadFiles(paths: string[], meta: { title?: string; tags?: string[] }) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: paths.length === 1 ? "Uploading file…" : `Uploading ${paths.length} files…`,
  });

  let succeeded = 0;
  for (const filePath of paths) {
    try {
      const info = await stat(filePath);
      if (!info.isFile()) {
        await showFailureToast(new Error(`Skipping non-file: ${filePath}`));
        continue;
      }
      if (info.size > MAX_BLOB_BYTES) {
        await showFailureToast(
          new Error(`${basename(filePath)} exceeds the 64 MB limit (${(info.size / 1_048_576).toFixed(1)} MB)`),
        );
        continue;
      }
      const bytes = await readFile(filePath);
      const filename = basename(filePath);
      await createObjectFromBlob(
        {
          bytes: new Uint8Array(bytes),
          filename,
          contentType: guessContentType(filename),
        },
        // Apply title only to a single-file upload — ambiguous across multiple
        paths.length === 1 ? meta : { tags: meta.tags },
      );
      succeeded += 1;
    } catch (error) {
      await showFailureToast(error, { title: `Failed: ${basename(filePath)}` });
    }
  }

  if (succeeded === paths.length) {
    toast.style = Toast.Style.Success;
    toast.title = succeeded === 1 ? "Uploaded" : `Uploaded ${succeeded} files`;
    await popToRoot();
  } else if (succeeded > 0) {
    toast.style = Toast.Style.Success;
    toast.title = `Uploaded ${succeeded} of ${paths.length} files`;
  } else {
    toast.hide();
  }
}
