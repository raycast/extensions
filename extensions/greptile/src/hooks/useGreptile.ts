import { Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getCodeReview,
  listCodeReviews,
  listPullRequests,
  searchComments,
} from "../api/greptile";
import {
  ListCodeReviewsInput,
  ListPullRequestsInput,
  SearchCommentsInput,
} from "../api/greptile";
import { PAGE_SIZE } from "../constants";
import { getErrorMessage } from "../helpers/errors";

export function usePullRequests(input: ListPullRequestsInput) {
  const { items, ...state } = usePaginatedResults(
    input,
    useCallback(async (input: ListPullRequestsInput) => {
      const response = await listPullRequests(input);

      return {
        items: response.mergeRequests ?? [],
        total: response.total,
      };
    }, []),
  );

  return {
    pullRequests: items,
    ...state,
  };
}

export function useCodeReviews(input: ListCodeReviewsInput) {
  const { items, ...state } = usePaginatedResults(
    input,
    useCallback(async (input: ListCodeReviewsInput) => {
      const response = await listCodeReviews(input);

      return {
        items: response.codeReviews ?? [],
        total: response.total,
      };
    }, []),
  );

  return {
    codeReviews: items,
    ...state,
  };
}

export function useCodeReview(codeReviewId: string) {
  const { data, error, isLoading, mutate } = useCachedPromise(getCodeReview, [
    codeReviewId,
  ]);

  return {
    codeReview: data?.codeReview,
    error,
    isLoading,
    mutate,
  };
}

export function useSearchComments(
  input: SearchCommentsInput,
  execute: boolean,
) {
  const { items, ...state } = usePaginatedResults(
    input,
    useCallback(async (input: SearchCommentsInput) => {
      const response = await searchComments(input);

      return {
        items: response.comments ?? [],
        total: response.total,
      };
    }, []),
    execute,
  );

  return {
    comments: items,
    ...state,
  };
}

function usePaginatedResults<
  T,
  Input extends { limit?: number; offset?: number },
>(
  input: Input,
  fetchPage: (input: Input) => Promise<{ items: T[]; total?: number }>,
  execute = true,
) {
  const [items, setItems] = useState<T[]>([]);
  const [initialError, setInitialError] = useState<unknown>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const requestIdRef = useRef(0);
  const itemsRef = useRef<T[]>([]);
  const hasMoreRef = useRef(false);
  const isLoadingRef = useRef(false);

  const loadPage = useCallback(
    async (offset: number, mode: "replace" | "append") => {
      if (!execute || (mode === "append" && isLoadingRef.current)) {
        return;
      }

      const limit = input.limit ?? PAGE_SIZE;
      const requestId = ++requestIdRef.current;
      isLoadingRef.current = true;

      if (mode === "replace") {
        itemsRef.current = [];
        hasMoreRef.current = false;
        setItems([]);
        setInitialError(undefined);
        setHasMore(false);
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await fetchPage({
          ...input,
          limit,
          offset,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        const pageItems = response.items;
        const loaded = offset + pageItems.length;
        const nextHasMore =
          typeof response.total === "number"
            ? loaded < response.total
            : pageItems.length === limit;

        setItems((previousItems) => {
          const nextItems =
            mode === "append" ? [...previousItems, ...pageItems] : pageItems;
          itemsRef.current = nextItems;

          return nextItems;
        });
        hasMoreRef.current = nextHasMore;
        setHasMore(nextHasMore);
      } catch (error) {
        if (requestId === requestIdRef.current) {
          if (mode === "replace") {
            setInitialError(error);
          } else {
            void showToast({
              style: Toast.Style.Failure,
              title: "Could not load more results",
              message: getErrorMessage(error),
            });
          }
        }
      } finally {
        if (requestId === requestIdRef.current) {
          isLoadingRef.current = false;
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [execute, fetchPage, input],
  );

  useEffect(() => {
    if (!execute) {
      requestIdRef.current += 1;
      itemsRef.current = [];
      hasMoreRef.current = false;
      isLoadingRef.current = false;
      setItems([]);
      setInitialError(undefined);
      setIsLoading(false);
      setIsLoadingMore(false);
      setHasMore(false);
      return;
    }

    void loadPage(0, "replace");
  }, [execute, loadPage]);

  const loadMore = useCallback(() => {
    if (!hasMoreRef.current || isLoadingRef.current) {
      return;
    }

    void loadPage(itemsRef.current.length, "append");
  }, [loadPage]);

  return {
    items,
    error: initialError,
    isLoading: isLoading || isLoadingMore,
    isLoadingMore,
    hasMore,
    loadMore,
  };
}
