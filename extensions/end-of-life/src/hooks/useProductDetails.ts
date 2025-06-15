import { useEffect, useRef, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { popToRoot, showToast, Toast, Cache } from "@raycast/api";
import { EndOfLifeProductDetails, EndOfLifeProductDetailsCache } from "../types";

// Setup cache: 60 minutes
const CACHE_DURATION_IN_MS = 60 * 60 * 1_000;

type State = {
  cycles: EndOfLifeProductDetails[];
  isLoading: boolean;
};

const useProductDetails = (product: string): [EndOfLifeProductDetails[], boolean] => {
  const cache = new Cache();
  const [state, setState] = useState<State>({
    cycles: [],
    isLoading: true,
  });
  const cancelRef = useRef<AbortController | null>(null);
  useEffect(() => {
    async function fetchProducts() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        const cachedResponse = cache.get(product);
        let data: EndOfLifeProductDetails[] = [];
        if (cachedResponse) {
          const parsed: EndOfLifeProductDetailsCache = JSON.parse(cachedResponse);

          const elapsed = Date.now() - parsed.timestamp;
          console.log(`${product} cache age: ${elapsed / 1000} seconds`);

          if (elapsed <= CACHE_DURATION_IN_MS) {
            data = parsed.cycles;
          } else {
            console.log(`Cache expired for ${product}`);
          }
        }
        if (data.length === 0) {
          const res = await fetch(`https://endoflife.date/api/${product}.json`, {
            method: "get",
            signal: cancelRef.current.signal,
          });
          data = (await res.json()) as EndOfLifeProductDetails[];

          // Cache response
          if (data.length > 0) {
            const newCache: EndOfLifeProductDetailsCache = {
              timestamp: Date.now(),
              cycles: data,
            };
            cache.set(product, JSON.stringify(newCache));
          }
        }
        setState((previous) => ({
          ...previous,
          isLoading: false,
          cycles: data ?? [],
        }));
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: `Could not load details for ${product}`,
        });
        await popToRoot();
        setState((previous) => ({ ...previous, isLoading: false }));
      }
    }
    fetchProducts();
    return function cleanup() {
      cancelRef.current?.abort();
    };
  }, [cancelRef]);

  useEffect(() => {
    return () => {
      cancelRef?.current?.abort();
    };
  }, []);

  return [state.cycles, state.isLoading];
};

export default useProductDetails;
