import { Action, ActionPanel, Detail, getPreferenceValues, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { EXPORT_FORMATS, Paper, ExportFormat } from "./export-formats";
import { fetchAndCopyFormatted, copyFormattedPaper } from "./export-clipboard";

const { port, preferredFormat } = getPreferenceValues<Preferences.LatticeSearch>();
const BASE = `http://127.0.0.1:${port || "52731"}/api/v1`;

function validatePreferredFormat(value: unknown): ExportFormat {
  if (typeof value === "string" && EXPORT_FORMATS.some((f) => f.id === value)) {
    return value as ExportFormat;
  }
  return "bibtex";
}

const PREFERRED_FORMAT: ExportFormat = validatePreferredFormat(preferredFormat);

function getFormatTitle(format: ExportFormat): string {
  const option = EXPORT_FORMATS.find((f) => f.id === format);
  return option?.title || "BibTeX";
}

interface SearchResult {
  id: string;
  title: string;
  authorsDisplay: string;
  subtitle: string;
  year: number;
  citekey: string;
  paperType: string;
}

function PaperDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading, error } = useFetch<Paper>(`${BASE}/papers/${id}`);

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to load paper", message: error.message });
    }
  }, [error]);

  const md = error
    ? `## Failed to Load Paper\n\nCould not load paper details from \`${BASE}/papers/${id}\`.\n\n${error.message}`
    : data
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
        <ActionPanel>
          <Action title="Back to Results" icon={Icon.ArrowLeft} onAction={onBack} />
          {data && (
            <>
              <Action
                title={`Export to ${getFormatTitle(PREFERRED_FORMAT)} Format`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={() => copyFormattedPaper(data, PREFERRED_FORMAT)}
              />
              <ActionPanel.Submenu title="Export to More Formats…" shortcut={{ modifiers: ["ctrl", "cmd"], key: "c" }}>
                {EXPORT_FORMATS.map((format) => (
                  <Action key={format.id} title={format.title} onAction={() => copyFormattedPaper(data, format.id)} />
                ))}
              </ActionPanel.Submenu>
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
            </>
          )}
        </ActionPanel>
      }
    />
  );
}

// Fetches full paper data on demand and copies in preferred format to clipboard.
function CopyPreferredAction({ id, shortcut }: { id: string; shortcut?: Action.Props["shortcut"] }) {
  const formatTitle = getFormatTitle(PREFERRED_FORMAT);

  async function handleAction() {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Fetching ${formatTitle}…` });
    try {
      const res = await fetch(`${BASE}/papers/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const paper: Paper = await res.json();
      await copyFormattedPaper(paper, PREFERRED_FORMAT);
      toast.style = Toast.Style.Success;
      toast.title = `${formatTitle} copied`;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to copy";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return <Action title={`Export to ${formatTitle} Format`} shortcut={shortcut} onAction={handleAction} />;
}

// Submenu for exporting in different formats
function ExportFormatsAction({ id, shortcut }: { id: string; shortcut?: Keyboard.Shortcut }) {
  return (
    <ActionPanel.Submenu title="Export to More Formats…" shortcut={shortcut}>
      {EXPORT_FORMATS.map((format) => (
        <Action key={format.id} title={format.title} onAction={() => fetchAndCopyFormatted(BASE, id, format.id)} />
      ))}
    </ActionPanel.Submenu>
  );
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useFetch<{ papers: SearchResult[] }>(
    `${BASE}/search?q=${encodeURIComponent(query)}&limit=50`,
    {
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Search failed", message: error.message });
    }
  }, [error]);

  if (selectedId) {
    return <PaperDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search literature…" onSearchTextChange={setQuery} throttle>
      {query.length > 0 && error ? (
        <List.EmptyView
          title="Search failed"
          description={`Could not reach ${BASE}. Check that Lattice is running and the API port is correct.`}
          icon={Icon.ExclamationMark}
        />
      ) : null}
      {(data?.papers ?? []).map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ text: item.citekey }]}
          actions={
            <ActionPanel>
              <Action title="View Details" onAction={() => setSelectedId(item.id)} />
              <CopyPreferredAction id={item.id} shortcut={{ modifiers: ["cmd"], key: "c" }} />
              <ExportFormatsAction id={item.id} shortcut={{ modifiers: ["ctrl", "cmd"], key: "c" }} />
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
