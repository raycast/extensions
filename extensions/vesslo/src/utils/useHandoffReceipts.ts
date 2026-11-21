import { useCallback, useEffect, useRef, useState } from "react";
import {
  HandoffReceiptReader,
  initialReceiptState,
  ReceiptReadState,
} from "./receipt-reader";

export function sameReceiptPresentation(
  left: ReceiptReadState,
  right: ReceiptReadState,
): boolean {
  return (
    JSON.stringify({ ...left, checkedAt: null }) ===
    JSON.stringify({ ...right, checkedAt: null })
  );
}

/** Polls only while mounted; forced refresh bypasses the stat cache. */
export function useHandoffReceipts() {
  const [state, setState] = useState<ReceiptReadState>(initialReceiptState);
  const currentState = useRef(state);
  const reader = useRef<HandoffReceiptReader | null>(null);
  const accept = useCallback((next: ReceiptReadState) => {
    const previous = currentState.current;
    currentState.current = next;
    if (!sameReceiptPresentation(previous, next)) setState(next);
  }, []);
  const refresh = useCallback(async () => {
    const active = reader.current;
    if (!active) return currentState.current;
    const next = await active.read({ force: true });
    if (reader.current === active) accept(next);
    return next;
  }, [accept]);
  useEffect(() => {
    const active = new HandoffReceiptReader();
    reader.current = active;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      const next = await active.read();
      if (reader.current !== active) return;
      accept(next);
      timer = setTimeout(poll, 3000);
    };
    void poll();
    return () => {
      active.dispose();
      if (reader.current === active) reader.current = null;
      clearTimeout(timer);
    };
  }, [accept]);
  return { state, isLoading: state.status === "loading", refresh };
}
