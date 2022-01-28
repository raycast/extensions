import { useEffect, useState } from "react";
import axios from "axios";
import { showToast, ToastStyle } from "@raycast/api";
import type { GoogleBooksResponse, VolumeItem } from "../types/google-books.dt";

type UseSearchReturn = { items: VolumeItem[] | undefined; loading: boolean };

function useSearch(query: string | undefined): UseSearchReturn {
  const [items, setItems] = useState<undefined | VolumeItem[]>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  async function searchBooks(query: string) {
    try {
      setLoading(true);
      const response = await axios.get<GoogleBooksResponse>(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=40`
      );
      setLoading(false);
      setItems(response?.data?.items);
    } catch (error: any) {
      setItems([]);
      console.error(error?.response?.data);
      error?.response?.data
        ? await showToast(
            ToastStyle.Failure,
            "Something went wrong",
            `${error?.response?.data.error?.code} - ${error?.response?.data.error.message}`
          )
        : await showToast(ToastStyle.Failure, "Something went wrong");
    }
  }
  useEffect(() => {
    if (query) {
      searchBooks(query).then((r) => r);
    }
  }, [query]);

  return { items, loading };
}

export { useSearch };
