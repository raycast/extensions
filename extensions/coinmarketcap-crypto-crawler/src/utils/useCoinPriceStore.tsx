import { fetchPrice } from "../api";
import { useEffect, useState } from "react";
import { PriceData } from "../types";

type PriceStore = Record<string, PriceData>;

export default function useCoinPriceStore(slug: string) {
  const [priceStore, setPriceStore] = useState<PriceStore>({});

  useEffect(() => {
    if (slug && !priceStore[slug]) {
      fetchPrice(slug).then((data) => {
        setPriceStore((prev: PriceStore) => ({ ...prev, [slug]: data } as PriceStore));
      });
    }
  }, [slug]);

  const refresh = () => {
    if (slug) {
      fetchPrice(slug).then((data) => {
        setPriceStore((prev: PriceStore) => ({ ...prev, [slug]: data } as PriceStore));
      });
    }
  };

  return { store: priceStore, refresh };
}
