import { useState, useEffect, useRef, useCallback } from "react";
import { VessloDataReader } from "./data-reader";
import {
  hasSameDataPresentation,
  initialVessloDataState,
  VessloDataState,
} from "./data-state";

const REFRESH_INTERVAL = 3000;

export function useVessloData() {
  const [state, setState] = useState<VessloDataState>(initialVessloDataState);
  const currentState = useRef(state);
  const reader = useRef<VessloDataReader | null>(null);

  const acceptSnapshot = useCallback((next: VessloDataState) => {
    const previous = currentState.current;
    currentState.current = next;
    if (!hasSameDataPresentation(previous, next)) setState(next);
  }, []);

  const refresh = useCallback(async () => {
    const activeReader = reader.current;
    if (!activeReader) return currentState.current;
    const next = await activeReader.read({ force: true });
    if (reader.current === activeReader) {
      acceptSnapshot(next);
    }
    return next;
  }, [acceptSnapshot]);

  const getCurrentState = useCallback(() => currentState.current, []);

  useEffect(() => {
    const activeReader = new VessloDataReader();
    reader.current = activeReader;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      const next = await activeReader.read();
      if (reader.current !== activeReader) return;
      acceptSnapshot(next);
      timer = setTimeout(poll, REFRESH_INTERVAL);
    };
    void poll();
    return () => {
      activeReader.dispose();
      if (reader.current === activeReader) reader.current = null;
      clearTimeout(timer);
    };
  }, [acceptSnapshot]);

  return {
    data: state.data,
    isLoading: state.status === "loading",
    state,
    refresh,
    getCurrentState,
  };
}
