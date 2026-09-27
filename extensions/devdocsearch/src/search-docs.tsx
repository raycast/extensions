import { Action, ActionPanel, Detail, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { type SavedPage, type SearchResult } from "./docs";
import { listCollections } from "./library";
import { searchHybridLibrary } from "./semantic";
import { environment } from "@raycast/api";

function PageDetail({ page, excerpt }: { page: SavedPage; excerpt: string }) {
  return <Detail markdown={page.markdown} metadata={<Detail.Metadata>
    <Detail.Metadata.Link title="Source" text={page.url} target={page.url} />
    <Detail.Metadata.Label title="Saved" text={new Date(page.fetchedAt).toLocaleString()} />
  </Detail.Metadata>} actions={<ActionPanel>
    <Action.OpenInBrowser title="Open Original Page" url={page.url} />
    <Action.CopyToClipboard title="Copy Excerpt" content={excerpt} />
    <Action.CopyToClipboard title="Copy Page Markdown" content={page.markdown} />
    <Action.CopyToClipboard title="Copy Source URL" content={page.url} />
  </ActionPanel>} />;
}

export default function SearchDocs() {
  const { push } = useNavigation();
  const [hasPages, setHasPages] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(true);

  useEffect(() => {
    let active = true;
    listCollections(undefined, environment.supportPath).then((collections) => {
      if (active) { setHasPages(collections.length > 0); setLoading(false); }
    }).catch(async (error) => {
      if (active) {
        setLoading(false);
        await showToast({ style: Toast.Style.Failure, title: "Could not read saved docs", message: error instanceof Error ? error.message : String(error) });
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setSearching(true);
    let active = true;
    const timer = setTimeout(() => {
      searchHybridLibrary(query, environment.assetsPath, environment.supportPath).then((matches) => {
        if (active) { setResults(matches); setSearching(false); }
      }).catch(async (error) => {
        if (active) {
          setSearching(false);
          await showToast({ style: Toast.Style.Failure, title: "Search failed", message: error instanceof Error ? error.message : String(error) });
        }
      });
    }, 120);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  return <List isLoading={loading || searching} onSearchTextChange={setQuery} searchBarPlaceholder="Search downloaded documentation" throttle>
    {!loading && !searching && results.length === 0 ? <List.EmptyView
      title={!hasPages ? "No documentation downloaded" : query.trim() ? "No matching pages" : "Search offline documentation"}
      description={!hasPages ? "Open Download Docs to add a site." : query.trim() ? "Try another query." : "Type a topic or question to search saved pages."}
    /> : null}
    {results.map(({ page, excerpt }) => <List.Item key={page.url} title={page.title} subtitle={excerpt} accessories={[{ text: new URL(page.url).hostname }]} actions={<ActionPanel>
      <Action title="Read Saved Page" onAction={() => push(<PageDetail page={page} excerpt={excerpt} />)} />
      <Action.OpenInBrowser title="Open Original Page" url={page.url} />
      <Action.CopyToClipboard title="Copy Excerpt" content={excerpt} />
      <Action.CopyToClipboard title="Copy Page Markdown" content={page.markdown} />
      <Action.CopyToClipboard title="Copy Source URL" content={page.url} />
    </ActionPanel>} />)}
  </List>;
}
