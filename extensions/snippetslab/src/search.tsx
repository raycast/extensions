import { List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { SnippetListItem } from "./components/list_item";
import { SearchFilterDropdown } from "./components/search_filter";
import { SnippetsLab } from "./hooks/useSnippetsLab";
import type { CLIListFiltersResponse, CLISearchJSONResponse } from "./models/response";
import { Snippet } from "./models/snippet";

interface SnippetsSearchProps {
    app: SnippetsLab;

    /** The initial search text to populate (e.g. fallback text when used as a fallback command.) */
    searchText?: string;
}

/** Implementation of the main search functionality. */
export function SnippetsSearch({ app, searchText: initialSearchText }: SnippetsSearchProps) {
    /**
     * The number of tasks that are running; a loading indicator may be used when this value is
     * greater than 0.
     */
    const [loadingDepth, setLoadingDepth] = useState(0);
    const [snippets, setSnippets] = useState<Snippet[]>();
    const [availableFilters, setAvailableFilters] = useState<CLIListFiltersResponse>();
    const [searchFilter, setSearchFilter] = useState<string>();
    const [searchText, setSearchText] = useState<string>(initialSearchText || "");

    useEffect(() => {
        fetchSearchFilters();
    }, []);

    useEffect(() => {
        performSearch();
    }, [searchText, searchFilter]);

    const fetchSearchFilters = async () => {
        try {
            setLoadingDepth((prev) => prev + 1);
            const output = await app.run("list", ["filters"]);
            const response = JSON.parse(output) as CLIListFiltersResponse;
            setAvailableFilters(response);
        } catch (error) {
            showToast(Toast.Style.Failure, "An error occurred");
            console.error(error);
        } finally {
            setLoadingDepth((prev) => prev - 1);
        }
    };

    const performSearch = async () => {
        try {
            setLoadingDepth((prev) => prev + 1);
            // Empty query returns all snippets.
            const query = searchText || "";
            const components = searchFilter?.includes(":") ? searchFilter?.split(":") : null;
            const args = components
                ? [`--${components[0]}`, components[1], "--", query]
                : ["--", query];
            const output = await app.run("search", args);
            const response = JSON.parse(output) as CLISearchJSONResponse;
            setSnippets(response.snippets.map((snippet) => new Snippet(snippet)));
        } catch (error) {
            if (error instanceof Error && error.message === "AbortError") {
                return;
            }
            showToast(Toast.Style.Failure, "An error occurred");
            // If we run into an error during the initial request, initialize the list as empty.
            setSnippets((prev) => (prev ? prev : []));
            console.error(error);
        } finally {
            setLoadingDepth((prev) => prev - 1);
        }
    };

    return (
        <List
            searchBarPlaceholder="Search in SnippetsLab…"
            searchBarAccessory={
                <SearchFilterDropdown filters={availableFilters} onChange={setSearchFilter} />
            }
            onSearchTextChange={setSearchText}
            isLoading={snippets === undefined || loadingDepth > 0}
        >
            {snippets?.map((snippet) => (
                <SnippetListItem key={snippet.uuid} app={app} snippet={snippet} />
            ))}
        </List>
    );
}
