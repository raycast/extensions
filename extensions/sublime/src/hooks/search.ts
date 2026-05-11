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
        page?: number,
    ) => Promise<{ results: SublimeCard[]; nextPage?: number }>,
    fetchInitial = false,
) {
    // Search cards via API
    const [isLoading, setIsLoading] = useState(true);
    const [cards, setCards] = useState<SublimeCardWithMarkdown[]>();
    const [nextPage, setNextPage] = useState<number>();
    function runSearch(query: string, restrictToLibrary: boolean) {
        if (!query && !fetchInitial) {
            // Reset
            setIsLoading(false);
            setCards(undefined);
            setNextPage(undefined);
            return;
        }

        setIsLoading(true);
        search(query, restrictToLibrary)
            .then(({ results, nextPage }) => {
                setIsLoading(false);
                setCards(results.map(populateCardMarkdown));
                setNextPage(nextPage);
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
        if ((!searchQuery && !fetchInitial) || !nextPage || isLoadingMore.current) {
            return;
        }
        isLoadingMore.current = true;

        const { results: newCards, nextPage: newNextPage } = await search(searchQuery, restrictToLibrary, nextPage);
        setCards([...cards!, ...newCards.map(populateCardMarkdown)]);
        setNextPage(newNextPage);
        isLoadingMore.current = false;
    }

    return {
        isLoading,
        cards,
        pagination: {
            pageSize: 15,
            hasMore: nextPage !== undefined,
            onLoadMore,
        },
    };
}
