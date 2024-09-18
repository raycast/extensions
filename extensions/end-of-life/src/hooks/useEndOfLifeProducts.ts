import { useEffect, useRef, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { popToRoot, showToast, Toast, Cache } from "@raycast/api";
import { EndOfLifeProductsCache } from "../types";

// Setup cache: 60 minutes
const CACHE_KEY = "EOL_PRODUCTS";
const CACHE_DURATION_IN_MS = 60 * 60 * 1_000;

type State = {
  products: string[];
  isLoading: boolean;
};

const useEndOfLifeProducts = (): [string[], boolean] => {
  const cache = new Cache();
  const [state, setState] = useState<State>({
    products: [],
    isLoading: true,
  });
  const cancelRef = useRef<AbortController | null>(null);
  useEffect(() => {
    async function fetchProducts() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        const cachedResponse = cache.get(CACHE_KEY);
        let data: string[] = [];
        if (cachedResponse) {
          const parsed: EndOfLifeProductsCache = JSON.parse(cachedResponse);

          const elapsed = Date.now() - parsed.timestamp;
          console.log(`${CACHE_KEY} cache age: ${elapsed / 1000} seconds`);

          if (elapsed <= CACHE_DURATION_IN_MS) {
            data = parsed.products;
          } else {
            console.log(`Cache expired for ${CACHE_KEY}`);
          }
        }
        if (data.length === 0) {
          const res = await fetch(`https://endoflife.date/api/all.json`, {
            method: "get",
            signal: cancelRef.current.signal,
          });
          data = (await res.json()) as string[];

          // Cache response
          if (data.length > 0) {
            const newCache: EndOfLifeProductsCache = {
              timestamp: Date.now(),
              products: data,
            };
            cache.set(CACHE_KEY, JSON.stringify(newCache));
          }
        }
        setState((previous) => ({
          ...previous,
          isLoading: false,
          products: data ?? [],
        }));
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Could not load end of life products",
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

  return [state.products, state.isLoading];
};

export default useEndOfLifeProducts;
