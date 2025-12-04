import { useEffect, useRef } from "react";
import { Json } from "./types";

export function useAsyncEffect(effect: () => Promise<void>, deps: Json[]) {
  const isProcessing = useRef(false);

  useEffect(() => {
    if (!isProcessing.current) {
      isProcessing.current = true;
      effect()
        .catch((error) => {
          console.error("Error in useAsyncEffect:", error);
        })
        .finally(() => {
          isProcessing.current = false;
        });
    }
  }, deps);
}
