import { useEffect, useState } from "react";
import {
    Action,
    ActionPanel,
    Clipboard,
    Icon,
    type LaunchProps,
    List,
    open,
    showInFinder,
    showToast,
    Toast,
} from "@raycast/api";

import { searchIndex } from "./lib/index-db";
import { type Capture, formatTimestamp, toCaptures } from "./lib/captures";
import { isIndexDbAvailable } from "./lib/paths";
import { primaryDeepLink } from "./lib/deep-link";

const DEBOUNCE_MS = 250;

export default function Command(props: LaunchProps) {
    // When launched as a Raycast fallback command, the text typed in the root
    // search bar arrives as `fallbackText` — seed the search with it so results
    // appear immediately without retyping.
    const initialText = props.fallbackText ?? "";
    const [searchText, setSearchText] = useState(initialText);
    const [debouncedText, setDebouncedText] = useState(initialText);
    const [results, setResults] = useState<Capture[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const dbAvailable = isIndexDbAvailable();

    // Debounce the raw search text (~250ms).
    useEffect(() => {
        const handle = setTimeout(() => setDebouncedText(searchText), DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [searchText]);

    // Run the search whenever the debounced term changes.
    useEffect(() => {
        const term = debouncedText.trim();

        if (!dbAvailable || term.length === 0) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        (async () => {
            try {
                const rows = await searchIndex(term);
                const captures = toCaptures(rows);
                if (!cancelled) {
                    setResults(captures);
                }
            } catch (error) {
                if (!cancelled) {
                    setResults([]);
                    await showToast({
                        style: Toast.Style.Failure,
                        title: "Search failed",
                        message: error instanceof Error ? error.message : String(error),
                    });
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [debouncedText, dbAvailable]);

    const term = debouncedText.trim();

    return (
        <List
            isShowingDetail
            isLoading={isLoading}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Search screenshots by their text…"
        >
            {!dbAvailable ? (
                <List.EmptyView
                    icon={Icon.ExclamationMark}
                    title="oh-shoot not found"
                    description="The oh-shoot OCR index could not be located. Make sure the oh-shoot macOS app is installed and has captured at least one screenshot."
                />
            ) : term.length === 0 ? (
                <List.EmptyView
                    icon={Icon.MagnifyingGlass}
                    title="Search your screenshots"
                    description="Start typing to find oh-shoot screenshots by the text recognised inside them."
                />
            ) : results.length === 0 && !isLoading ? (
                <List.EmptyView
                    icon={Icon.MagnifyingGlass}
                    title="No matching screenshots"
                    description={`Nothing matched “${term}”.`}
                />
            ) : (
                results.map((capture) => (
                    <CaptureItem key={capture.id} capture={capture} term={term} results={results} />
                ))
            )}
        </List>
    );
}

function CaptureItem({ capture, term, results }: { capture: Capture; term: string; results: Capture[] }) {
    const when = formatTimestamp(capture.sidecar.timestamp);
    const fileUrl = `file://${encodeURI(capture.pngPath)}`;
    const markdown = `![Screenshot](${fileUrl})`;

    return (
        <List.Item
            title={when}
            icon={{ source: capture.thumbPath }}
            detail={
                <List.Item.Detail
                    markdown={markdown}
                    metadata={
                        <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Captured" text={when} />
                            <List.Item.Detail.Metadata.Label
                                title="Dimensions"
                                text={`${capture.sidecar.width} × ${capture.sidecar.height}`}
                            />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="ID" text={capture.id} />
                        </List.Item.Detail.Metadata>
                    }
                />
            }
            actions={
                <ActionPanel>
                    <ActionPanel.Section>
                        <Action
                            title="Open in Oh-Shoot Gallery"
                            icon={Icon.AppWindow}
                            onAction={() => open(primaryDeepLink(term, results))}
                        />
                        <Action
                            title="Open This Screenshot in Gallery"
                            icon={Icon.Image}
                            onAction={() => open(`oh-shoot://capture/${capture.id}`)}
                        />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                        <Action
                            title="Copy Image"
                            icon={Icon.Clipboard}
                            onAction={async () => {
                                await Clipboard.copy({ file: capture.pngPath });
                                await showToast({ style: Toast.Style.Success, title: "Image copied" });
                            }}
                        />
                        <Action
                            title="Open in Preview"
                            icon={Icon.Eye}
                            onAction={() => open(capture.pngPath, "com.apple.Preview")}
                        />
                        <Action
                            title="Reveal in Finder"
                            icon={Icon.Finder}
                            onAction={() => showInFinder(capture.pngPath)}
                        />
                        <Action
                            title="Copy OCR Text"
                            icon={Icon.Text}
                            onAction={() => Clipboard.copy(capture.content)}
                        />
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
    );
}
