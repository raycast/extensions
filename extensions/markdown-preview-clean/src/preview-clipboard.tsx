import { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, Detail, Icon, showToast, Toast } from "@raycast/api";
import { MarkdownPreview } from "./markdown-preview";
import { readMarkdownFile } from "./file-source";

type Loaded =
  { kind: "text"; markdown: string } | { kind: "file"; markdown: string; filePath: string; fileName: string };

async function loadFromClipboard(): Promise<Loaded> {
  const clip = await Clipboard.read();

  // Copied file from Finder → preferred (keeps path for relative images)
  if (clip.file) {
    try {
      const source = await readMarkdownFile(clip.file);
      return { kind: "file", markdown: source.markdown, filePath: source.path, fileName: source.fileName };
    } catch {
      // not a markdown file — fall through to text
    }
  }

  const text = clip.text ?? "";
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Clipboard is empty");
  }

  // Use normalized text only while checking for a copied absolute path. If it
  // is Markdown content, preserve the clipboard value exactly as copied.
  const firstLine = trimmedText.split("\n")[0] ?? "";
  if (firstLine.startsWith("/") && /\.(md|markdown|mdx|mdown)$/i.test(firstLine)) {
    try {
      const source = await readMarkdownFile(firstLine);
      return { kind: "file", markdown: source.markdown, filePath: source.path, fileName: source.fileName };
    } catch {
      // treat as plain markdown text
    }
  }

  return { kind: "text", markdown: text };
}

export default function Command() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoaded(null);
    try {
      setLoaded(await loadFromClipboard());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Clipboard unavailable", message });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (error) {
    return (
      <Detail
        markdown={`# Nothing to preview\n\n${error}\n\nCopy Markdown text, a \`.md\` file, or an absolute path.`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={load} />
          </ActionPanel>
        }
      />
    );
  }

  if (!loaded) {
    return <Detail isLoading markdown="" />;
  }

  if (loaded.kind === "file") {
    return <MarkdownPreview markdown={loaded.markdown} filePath={loaded.filePath} />;
  }

  return <MarkdownPreview markdown={loaded.markdown} />;
}
