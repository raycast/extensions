import { getPreferenceValues, showToast, ToastStyle } from "@raycast/api";
import fetch, { AbortError } from "node-fetch";
import { useState, useRef, useEffect } from "react";

import type { File, FileDetail, Node } from "../types";
import { loadPages, storePages } from "../cache";

export function usePages(file: File) {
  const [pages, setPages] = useState<Node[]>();
  const abort = useRef<AbortController>();

  useEffect(() => {
    console.debug("Fetch pages...");

    async function fetch() {
      abort.current?.abort();
      abort.current = new AbortController();

      const cachedPages = await loadPages(file);

      if (cachedPages) {
        setPages(cachedPages);
      }

      const newPages = await fetchPages(file, abort.current.signal);
      setPages(newPages);

      await storePages(newPages, file);
    }

    fetch();

    return () => {
      abort.current?.abort();
    };
  }, [file]);

  return pages;
}

async function fetchPages(file: File, signal: AbortSignal): Promise<Node[]> {
  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues();

  try {
    const response = await fetch(`https://api.figma.com/v1/files/${file.key}?depth=1`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Figma-Token": PERSONAL_ACCESS_TOKEN,
      },
      signal,
    });

    const json = (await response.json()) as FileDetail;
    return json.document.children;
  } catch (error) {
    if (error instanceof AbortError) {
      return Promise.resolve([]);
    }

    console.error(error);
    showToast(ToastStyle.Failure, "Could not load pages");
    return Promise.resolve([]);
  }
}
