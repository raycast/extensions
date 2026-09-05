import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { MarkdownPreview } from "./markdown-preview";
import { resolveMarkdownFileSource, type MarkdownFileSource } from "./file-source";

export default function Command() {
  const [source, setSource] = useState<MarkdownFileSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resolved = await resolveMarkdownFileSource();
      setSource(resolved);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSource(null);
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "No Markdown file", message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <Detail isLoading markdown="Loading Markdown file…" />;
  }

  if (error || !source) {
    return (
      <Detail
        markdown={`# No Markdown file found

${error ?? ""}

## How to use

1. **Finder**: select a \`.md\` file, then run this command  
2. **Copy file** in Finder (\`⌘C\` on the file), then run this command  
3. **Copy absolute path** text of a \`.md\` file to the clipboard

Relative images like \`./images/diagram.png\` work in **Open in Browser**.
`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={load} />
          </ActionPanel>
        }
      />
    );
  }

  return <MarkdownPreview markdown={source.markdown} filePath={source.path} backTitle="Close" />;
}
