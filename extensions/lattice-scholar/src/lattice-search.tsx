import { Action, ActionPanel, Clipboard, Detail, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

const BASE = "http://127.0.0.1:52731/api/v1";

interface SearchResult {
  id: string;
  title: string;
  authorsDisplay: string;
  subtitle: string;
  year: number;
  citekey: string;
  paperType: string;
}

interface Paper {
  id: string;
  citekey: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  doi: string;
  volume: string;
  issue: string;
  pages: string;
  isbn: string;
  paperType: string;
  cslItem: Record<string, unknown>;
}

// Convert a Paper to BibTeX string.
// Swap this implementation for an API call when /papers/<id>/bibtex becomes available.
function getBibTeX(paper: Paper): string {
  const entryType = paper.paperType === "book" ? "book" : "article";
  const citekey = paper.citekey || "unknown";

  const fields: [string, string | undefined][] = [
    ["title", paper.title],
    ["author", paper.authors?.join(" and ")],
    ["year", paper.year ? String(paper.year) : undefined],
    ["journal", paper.journal],
    ["volume", paper.volume],
    ["number", paper.issue],
    ["pages", paper.pages],
    ["doi", paper.doi],
    ["isbn", paper.isbn],
  ];

  const body = fields
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k} = {${v}}`)
    .join(",\n");

  return `@${entryType}{${citekey},\n${body}\n}`;
}

// Fetches full paper data on demand and copies BibTeX to clipboard.
// Replace the fetch+getBibTeX call with a /papers/<id>/bibtex API call when available.
function CopyBibTeXAction({ id, shortcut }: { id: string; shortcut?: Action.Props["shortcut"] }) {
  async function handleAction() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching BibTeX…" });
    try {
      const res = await fetch(`${BASE}/papers/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const paper: Paper = await res.json();
      await Clipboard.copy(getBibTeX(paper));
      toast.style = Toast.Style.Success;
      toast.title = "BibTeX copied";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to copy BibTeX";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return <Action title="Copy BibTeX" shortcut={shortcut} onAction={handleAction} />;
}

function PaperDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useFetch<Paper>(`${BASE}/papers/${id}`);

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to load paper", message: error.message });
  }

  const md = data
    ? [
        `# ${data.title}`,
        data.authors?.length && `**Authors:** ${data.authors.join(", ")}`,
        data.year && `**Year:** ${data.year}`,
        data.journal && `**Journal:** ${data.journal}`,
        data.volume && `**Volume:** ${data.volume}`,
        data.issue && `**Issue:** ${data.issue}`,
        data.pages && `**Pages:** ${data.pages}`,
        data.doi && `**DOI:** [${data.doi}](https://doi.org/${data.doi})`,
        data.isbn && `**ISBN:** ${data.isbn}`,
        data.citekey && `**Citekey:** \`${data.citekey}\``,
      ]
        .filter(Boolean)
        .join("\n\n")
    : "Loading…";

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      actions={
        data && (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy BibTeX"
              content={getBibTeX(data)}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
            <Action.CopyToClipboard
              title="Copy Citekey"
              content={data.citekey}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {data.doi && (
              <Action.OpenInBrowser
                title="Open DOI in Browser"
                url={`https://doi.org/${data.doi}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            {data.doi && <Action.CopyToClipboard title="Copy DOI" content={data.doi} />}
            <Action.CopyToClipboard title="Copy Title" content={data.title} />
          </ActionPanel>
        )
      }
    />
  );
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useFetch<{ papers: SearchResult[] }>(
    `${BASE}/search?q=${encodeURIComponent(query)}&limit=50`,
    {
      execute: query.length > 0,
      keepPreviousData: true,
    },
  );

  if (selectedId) {
    return <PaperDetail id={selectedId} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search literature…" onSearchTextChange={setQuery} throttle>
      {(data?.papers ?? []).map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ text: item.citekey }]}
          actions={
            <ActionPanel>
              <Action title="View Details" onAction={() => setSelectedId(item.id)} />
              <CopyBibTeXAction id={item.id} shortcut={{ modifiers: ["cmd"], key: "b" }} />
              <Action.CopyToClipboard
                title="Copy Citekey"
                content={item.citekey}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
