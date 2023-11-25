import { showToast, Toast } from "@raycast/api";
import fetch, { AbortError } from "node-fetch";
import { useState, useRef, useEffect } from "react";

export const BASE_URL = "https://xkcd.com";

interface XKCD {
  month: string;
  num: number;
  link: string;
  year: string;
  news: string;
  safe_title: string;
  transcript: string;
  alt: string;
  img: string;
  title: string;
  day: string;
}

export type Comic = Pick<XKCD, "num" | "title" | "img" | "alt">;

export function useCurrentSelectedComic(num?: number) {
  const [isLoading, setIsLoading] = useState(false);
  const [comic, setComic] = useState<Comic | undefined>(undefined);
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (num === -1) {
      return;
    }

    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    setIsLoading(true);

    fetchComic(num, cancelRef.current.signal)
      .then(setComic)
      .then(() => setIsLoading(false))
      .catch((err) => {
        if (err instanceof AbortError) {
          return;
        }
        console.error(err);
        showToast(Toast.Style.Failure, "Failed to fetch comic.");
        setIsLoading(false);
      });

    return () => {
      cancelRef.current?.abort();
    };
  }, [cancelRef, setIsLoading, num, setComic]);

  return [comic, isLoading] as const;
}

export const fetchComic = async (num?: number, signal?: AbortSignal) => {
  const res = await fetch(`${BASE_URL}/${num ? num + "/" : ""}info.0.json`, { signal });

  if (!res.ok) {
    throw new Error("Failed to fetch comic");
  }

  const comicData = (await res.json()) as XKCD;

  const filteredData: Comic = {
    num: comicData.num,
    title: comicData.title,
    img: comicData.img,
    alt: comicData.alt,
  };
  return filteredData;
};

export const maxNum = async () => {
  try {
    const comicData = (await fetch(`${BASE_URL}/info.0.json`).then((res) => res.json())) as XKCD;
    return comicData.num;
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, "Failed to fetch comic.");
    throw new Error("Failed to fetch comic.");
  }
};
