import { useMemo } from "react";
import useSWR from "swr";
import { getItemThumbnail, getApplicationInfo, getItems, getFolderList } from "./api";
import { fromPathToBase64Url } from "./base64";

/**
 * It fetches the thumbnail of an item from the server and converts it to a base64
 * URL
 * @param {string} id - The id of the item
 * @param {string} ext - The file extension of the image.
 * @returns A base64Url
 */
export function useThumbnail(id: string, ext: string) {
  return useSWR(`/api/item/thumbnail?id=${id}`, async () => {
    const res = await getItemThumbnail(id);
    const imagePath = decodeURIComponent(res.data.data);

    const base64Url = await fromPathToBase64Url(imagePath, ext);

    return base64Url;
  });
}

export function useApplicationInfo() {
  return useSWR("/application/info", async () => {
    const res = await getApplicationInfo();
    return res.data.data;
  });
}

export function useItemList(search: string) {
  const { data, error } = useSWR(`/api/item/list?keyword=${search}`, () => {
    return getItems({ keyword: search });
  });

  const items = useMemo(() => {
    if (!data || data.data.status !== "success") return [];

    return data.data.data;
  }, [data]);

  return {
    data: items,
    isLoading: !error && !data,
    error,
  };
}

export function useFolderItemList(folders?: string) {
  const { data, error } = useSWR(
    () => (folders ? `/api/folder/item/list?folders=${folders}` : null),
    () => {
      return getItems({ folders: folders });
    }
  );

  const items = useMemo(() => {
    if (!data || data.data.status !== "success") return [];

    return data.data.data;
  }, [data]);

  return {
    data: items,
    isLoading: !error && !data,
    error,
  };
}

export function useFolderList() {
  const { data, error } = useSWR(`/api/folder/list`, () => {
    return getFolderList();
  });

  const items = useMemo(() => {
    if (!data || data.data.status !== "success") return [];

    return data.data.data;
  }, [data]);

  return {
    data: items,
    isLoading: !error && !data,
    error,
  };
}
