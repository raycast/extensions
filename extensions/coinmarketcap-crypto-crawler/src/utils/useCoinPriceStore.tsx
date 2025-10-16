import { fetchPrice } from "../api";
import { useEffect, useState } from "react";
import { PriceData } from "../types";
import { showToast, ToastStyle } from "@raycast/api";

type PriceStore = Record<string, PriceData>;

export default function useCoinPriceStore(slug: string) {
  const [priceStore, setPriceStore] = useState<PriceStore>({});

  useEffect(() => {
    if (slug && !priceStore[slug]) {
      fetchPrice(slug).then((data) => {
        setPriceStore((prev: PriceStore) => ({ ...prev, [slug]: data }) as PriceStore);
      });
    }
  }, [slug]);

  const refresh = () => {
    if (slug) {
      fetchPrice(slug)
        .then((data) => {
          if (!data) return;
          setPriceStore((prev: PriceStore) => ({ ...prev, [slug]: data }) as PriceStore);
          showToast(ToastStyle.Success, "Refreshed successfully");
        })
        .catch((error) => {
          showToast(ToastStyle.Failure, "Refresh failed", (error as Error)?.message);
        });
    }
  };

  const batchFetchPrice = async (slugs: string[]) => {
    const result = await Promise.all(slugs.map((slug) => fetchPrice(slug).then((data) => ({ slug, data }))));
    setPriceStore((prev: PriceStore) => {
      const newPriceStore = { ...prev };
      result.forEach(({ slug, data }) => {
        if (data) {
          newPriceStore[slug] = data;
        }
      });
      return newPriceStore;
    });
  };

  return { store: priceStore, refresh, batchFetchPrice };
}
