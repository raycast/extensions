import { ActionPanel, Action, List, showToast, Toast, useNavigation, Detail } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";

export default function Command() {
    const { state, search } = useSearch();

    return (
        <List
            isLoading={state.isLoading}
            onSearchTextChange={search}
            searchBarPlaceholder="Search Papers"
            throttle
        >
            <List.Section title="Results" subtitle={state.results.length + ""}>
                {state.results.map((paper) => (
                    <SearchListItem key={paper.title} paper={paper} />
                ))}
            </List.Section>
        </List>
    );
}

function SearchListItem({ paper }: { paper: Paper }) {
    let authorText = paper.authors && paper.authors.length > 1 ? paper.authors[0].name : "";
    if (paper.authors && paper.authors.length > 1) {
        authorText += ", et al.";
    }

    return (
        <List.Item
            title={paper.title}
            subtitle={String(paper.year) + " (" + String(paper.citationCount) + ")"}
            accessoryTitle={authorText}
            actions={
                <ActionPanel>
                    <ActionPanel.Section>
                        <Action.Push title="Show Details" target={<PaperDetails paper={paper} />} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                        <Action.OpenInBrowser title="Open in Browser" url={paper.url} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                        <Action.CopyToClipboard
                            title="Copy DOI"
                            content={`npm install ${paper.DOI}`}
                        />
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
    );
}

function PaperDetails({ paper }: { paper: Paper }) {
    let md = `# ${paper.title}\n`;
    md += `**Publication Year**: ${paper.year}\n\n`;
    md += `**Citations**: ${paper.citationCount}\n\n`
    md += `**Venue**: *${paper.venue}*\n`;
    md += `## Authors\n`;
    md += `${paper.authors?.map((a) => a.name).join(", ")}\n`;
    md += `## Abstract\n`;
    md += `${paper.abstract}\n`;


    return (
        <Detail
            markdown={md}
            actions={
                <ActionPanel>
                    <ActionPanel.Section>
                        <Action.OpenInBrowser title="Open in Browser" url={paper.url} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                        <Action.CopyToClipboard
                            title="Copy DOI"
                            content={`${paper.DOI}`}
                        />
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
    )
}

function useSearch() {
    const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
    const cancelRef = useRef<AbortController | null>(null);

    const search = useCallback(
        async function search(searchText: string) {
            cancelRef.current?.abort();
            cancelRef.current = new AbortController();
            setState((oldState) => ({
                ...oldState,
                isLoading: true,
            }));
            try {
                const results = await performSearch(searchText, cancelRef.current.signal);
                setState((oldState) => ({
                    ...oldState,
                    results: results,
                    isLoading: false,
                }));
            } catch (error) {
                setState((oldState) => ({
                    ...oldState,
                    isLoading: false,
                }));

                if (error instanceof AbortError) {
                    return;
                }

                console.error("search error", error);
                showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
            }
        },
        [cancelRef, setState]
    );

    useEffect(() => {
        search("");
        return () => {
            cancelRef.current?.abort();
        };
    }, []);

    return {
        state: state,
        search: search,
    };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<Paper[]> {

    const params = new URLSearchParams();
    params.append("query", searchText.length === 0 ? "@raycast/api" : searchText);
    params.append("fields", "url,abstract,authors,url,title,citationCount,externalIds,venue,year,referenceCount");
    params.append("limit", "10");

    const response = await fetch("https://api.semanticscholar.org/graph/v1/paper/search" + "?" + params.toString(), {
        method: "get",
        signal: signal,
    });

    const json = (await response.json()) as
        | {
            total: number,
            offset: number,
            data: {
                paperId: string,
                title: string,
                venue: string,
                year: number,
                referenceCount: number,
                citationCount: number,
                externalIds: {
                    DOI?: string
                }
                url: string,
                abstract: string,
                authors: {
                    authorId: string,
                    name: string
                }[]
            }[]
        } | { code: string, message: string };

    if (!response.ok || "message" in json) {
        throw new Error("message" in json ? json.message : response.statusText);
    }

    return json.data.map((paper) => {
        return {
            id: paper.paperId,
            title: paper.title,
            abstract: paper.abstract ? paper.abstract : "[ empty abstract ]",
            authors: paper.authors,
            url: paper.url,
            venue: paper.venue ? paper.venue : "unknown",
            year: paper.year,
            referenceCount: paper.referenceCount,
            citationCount: paper.citationCount,
            DOI: paper.externalIds.DOI ? paper.externalIds.DOI : "unknown"
        };
    });
}

interface SearchState {
    results: Paper[];
    isLoading: boolean;
}

interface Author {
    name: string;
}

interface Paper {
    id: string,
    title: string;
    abstract?: string;
    authors?: Author[];
    url: string;
    venue: string;
    year: number;
    referenceCount: number;
    citationCount: number;
    DOI: string;
}
