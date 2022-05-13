import { useState, useRef, useCallback } from "react";
import { clearSearchBar } from "@raycast/api";

import { createTypes } from "../typeUtilities";
import { useDebounce } from "../utilities";

import { AvailableColor } from "../colors/Color";

export interface RenderResult {
  isLoading: boolean;
  colors: AvailableColor[];
}

export interface RenderColor {
  state: RenderResult;
  render: (searchText: string) => void;
  cancel: () => void;
}

export default function useRenderColor(): RenderColor {
  const [state, setState] = useState<RenderResult>({ isLoading: false, colors: [] });
  const cancelRef = useRef<AbortController | null>(null);

  const render = useCallback(
    useDebounce(async function render(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      try {
        const colors = createTypes(searchText);

        setState(() => ({
          colors,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          colors: [],
          isLoading: searchText !== "",
        }));
      }
    }, 500),
    [cancelRef, setState]
  );

  return {
    state,
    render,
    cancel() {
      setState(() => ({
        colors: [],
        isLoading: false,
      }));
      clearSearchBar();
    },
  };
}
