import { GifsResult } from "@giphy/js-fetch-api";
import { showToast, Toast } from "@raycast/api";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { GiphyContext } from "../contexts/GiphyContext";
import { useApp } from "./useApp";
import { useDispatch } from "./useDispatch";
import { IGif } from "@giphy/js-types";

const GIF_PRE_PAGE = 28;

export type ViewHandle = (gif: IGif) => void;
export type SearchState = "giphy" | "favs" | "history";

function useGiphy() {
  const giphy = useContext(GiphyContext);
  const state = useApp();
  const dispatch = useDispatch();
  const cancelRef = useRef<AbortController | null>(null);
  const [searchState, setSearchState] = useState<SearchState>("giphy");

  const tranding = useCallback(async () => {
    dispatch({ type: "loading" });
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    try {
      if (cancelRef.current?.signal?.aborted) {
        throw "ERR_CANCELED";
      }

      const _trending = () =>
        new Promise<GifsResult>((resolve, reject) => {
          cancelRef.current?.signal?.addEventListener("abort", reject);
          giphy
            .trending({ limit: GIF_PRE_PAGE + 2 })
            .then(resolve)
            .catch(reject);
        });

      const result = await _trending();
      dispatch({ type: "fetched", payload: result });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any) !== "ERR_CANCELED") {
        dispatch({ type: "error", payload: error as Error });
      }
    }
  }, [dispatch]);

  const giphySeatch = useCallback(async () => {
    dispatch({ type: "loading" });
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    try {
      if (cancelRef.current?.signal?.aborted) {
        throw "ERR_CANCELED";
      }

      const _search = () =>
        new Promise<GifsResult>((resolve, reject) => {
          cancelRef.current?.signal?.addEventListener("abort", reject);
          giphy.search(state.searchText, { limit: GIF_PRE_PAGE, offset: state.offset }).then(resolve).catch(reject);
        });

      const result = await _search();
      dispatch({ type: "fetched", payload: result });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any) !== "ERR_CANCELED") {
        dispatch({ type: "error", payload: error as Error });
      }
    }
  }, [state, dispatch]);

  const search = useCallback(
    (input: string) => {
      dispatch({ type: "setSearchState", payload: { text: input, offset: 0 } });
    },
    [dispatch]
  );

  const next = useCallback(() => {
    if (state.gifs && state.gifs.pagination.total_count - state.offset === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Switch page",
        message: "Next page does not exist!",
      });
      return;
    }
    dispatch({
      type: "setSearchState",
      payload: {
        offset: state.gifs
          ? Math.min(state.gifs.pagination.total_count, state.offset + GIF_PRE_PAGE)
          : state.offset + GIF_PRE_PAGE,
      },
    });
  }, [state, dispatch]);

  const prev = useCallback(() => {
    if (state.offset - GIF_PRE_PAGE < 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Switch page",
        message: "Previous page does not exist!",
      });
      return;
    }
    dispatch({
      type: "setSearchState",
      payload: {
        offset: Math.max(state.offset - GIF_PRE_PAGE, 0),
      },
    });
  }, [state, dispatch]);

  const onView: ViewHandle = useCallback((gif: IGif) => {
    dispatch({ type: "addToRecents", payload: gif });
  }, []);

  useEffect(() => {
    if (searchState === "giphy") {
      if (state.searchText) {
        giphySeatch();
      } else {
        tranding();
      }
    }

    return () => {
      cancelRef.current?.abort();
    };
  }, [state.searchText, state.offset, searchState]);

  return {
    state,
    search,
    next,
    prev,
    searchBarText: state.searchText,
    pageNumber: Math.ceil(state.offset / GIF_PRE_PAGE),
    dispatch,
    onView,
    searchState,
    setSearchState,
  };
}

export default useGiphy;
