import { Action, ActionPanel, BrowserExtension, Detail, environment, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchMetadata, PaperMeta } from "./metadata";

type State =
  | { phase: "checking" }
  | { phase: "no-browser" }
  | { phase: "no-doi" }
  | { phase: "detection-error"; message: string }
  | { phase: "loading"; doi: string }
  | { phase: "metadata-error"; doi: string; message: string }
  | { phase: "done"; doi: string; meta: PaperMeta | null };

const DOI_REGEX = /\b(10\.\d{4,}\/[^\s"<>[\]{}|\\^`]+)/;

async function detectDoi(): Promise<string | null> {
  // 1. Check URL of active tab first (fast, no content fetch needed)
  const tabs = await BrowserExtension.getTabs();
  const active = tabs.find((t) => t.active) ?? tabs[0] ?? null;
  if (active?.url) {
    const urlMatch = active.url.match(/doi\.org\/(10\.\d{4,}\/[^\s?#]+)/);
    if (urlMatch) return decodeURIComponent(urlMatch[1]);
  }

  // 2. Fallback: scan page text content
  const content = await BrowserExtension.getContent({ format: "text" });
  const match = content.match(DOI_REGEX);
  return match ? match[1].replace(/[.,;:)\]}]+$/, "") : null;
}

function buildMarkdown(meta: PaperMeta, doi: string): string {
  const lines = [
    `# ${meta.title}`,
    meta.authors && `**Authors:** ${meta.authors}`,
    meta.year && `**Year:** ${meta.year}`,
    meta.source && `**Source:** ${meta.source}`,
    meta.volume && `**Volume:** ${meta.volume}`,
    meta.issue && `**Issue:** ${meta.issue}`,
    meta.pages && `**Pages:** ${meta.pages}`,
    meta.publisher && `**Publisher:** ${meta.publisher}`,
    `**DOI:** [${doi}](https://doi.org/${doi})`,
  ];
  return lines.filter(Boolean).join("\n\n");
}

function buildCitation(meta: PaperMeta, doi: string): string {
  return [meta.authors, meta.year && `(${meta.year})`, meta.title, meta.source, `https://doi.org/${doi}`]
    .filter(Boolean)
    .join(". ");
}

export default function Command() {
  const [state, setState] = useState<State>({ phase: "checking" });

  useEffect(() => {
    if (!environment.canAccess(BrowserExtension)) {
      setState({ phase: "no-browser" });
      return;
    }
    detectDoi()
      .then((doi) => {
        if (!doi) return setState({ phase: "no-doi" });
        setState({ phase: "loading", doi });
        return fetchMetadata(doi)
          .then((meta) => setState({ phase: "done", doi, meta }))
          .catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            showToast({ style: Toast.Style.Failure, title: "Failed to fetch metadata", message });
            setState({ phase: "metadata-error", doi, message });
          });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        showToast({ style: Toast.Style.Failure, title: "DOI detection failed", message });
        setState({ phase: "detection-error", message });
      });
  }, []);

  if (state.phase === "checking" || state.phase === "loading") {
    const msg = state.phase === "loading" ? `Fetching metadata for \`${state.doi}\`…` : "";
    return <Detail isLoading markdown={msg} />;
  }

  if (state.phase === "no-browser") {
    return (
      <Detail markdown="## Browser Extension Required\n\nInstall the [Raycast Browser Extension](https://www.raycast.com/browser-extension) to use this command." />
    );
  }

  if (state.phase === "no-doi") {
    return (
      <Detail
        markdown={`## No DOI Found

No DOI was detected on the current browser page.`}
      />
    );
  }

  if (state.phase === "detection-error") {
    return <Detail markdown={`## DOI Detection Failed\n\n${state.message}`} />;
  }

  if (state.phase === "metadata-error") {
    return (
      <Detail
        markdown={`## DOI Detected\n\n\`${state.doi}\`\n\nMetadata lookup failed.\n\n${state.message}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy DOI" content={state.doi} />
            <Action.OpenInBrowser
              title="Open in Browser"
              url={`https://doi.org/${state.doi}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // phase === "done"
  const { doi, meta } = state;
  const md = meta ? buildMarkdown(meta, doi) : `## DOI Detected\n\n\`${doi}\`\n\nCould not fetch metadata.`;

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy DOI" content={doi} />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`https://doi.org/${doi}`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          {meta && (
            <Action.CopyToClipboard
              title="Copy Citation"
              content={buildCitation(meta, doi)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
