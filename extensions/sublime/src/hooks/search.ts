import { useEffect, useRef, useState } from "react";
import { populateCardMarkdown, SublimeCardWithMarkdown } from "../utils/markdown";
import { showFailureToast } from "@raycast/utils";
import { SublimeCard } from "../utils/types";

export function useCardsSearch(
    searchQuery: string,
    restrictToLibrary: boolean,
    search: (
        query: string,
        restrictToLibrary: boolean,
        cursor?: string,
    ) => Promise<{ results: SublimeCard[]; nextCursor?: string }>,
    fetchInitial = false,
) {
    // Search cards via API
    const [isLoading, setIsLoading] = useState(true);
    const [cards, setCards] = useState<SublimeCardWithMarkdown[]>();
    const [nextCursor, setNextCursor] = useState<string>();
    function runSearch(query: string, restrictToLibrary: boolean) {
        if (!query && !fetchInitial) {
            // Reset
            setIsLoading(false);
            setCards(undefined);
            setNextCursor(undefined);
            return;
        }

        setIsLoading(true);
        search(query, restrictToLibrary)
            .then(({ results, nextCursor }) => {
                setIsLoading(false);
                setCards(results.map(populateCardMarkdown));
                setNextCursor(nextCursor);
            })
            .catch((error) => {
                setIsLoading(false);
                showFailureToast(error, { title: "Failed to search Sublime cards" });
            });
    }
    useEffect(() => {
        runSearch(searchQuery, restrictToLibrary);
    }, [searchQuery, restrictToLibrary]);

    // Fetch more results when scrolled down
    const isLoadingMore = useRef(false);
    async function onLoadMore() {
        if ((!searchQuery && !fetchInitial) || !nextCursor || isLoadingMore.current) {
            return;
        }
        isLoadingMore.current = true;

        const { results: newCards, nextCursor: newNextCursor } = await search(
            searchQuery,
            restrictToLibrary,
            nextCursor,
        );
        setCards([...cards!, ...newCards.map(populateCardMarkdown)]);
        setNextCursor(newNextCursor);
        isLoadingMore.current = false;
    }

    return {
        isLoading,
        cards,
        pagination: {
            pageSize: 15,
            hasMore: nextCursor !== undefined,
            onLoadMore,
        },
    };
}
