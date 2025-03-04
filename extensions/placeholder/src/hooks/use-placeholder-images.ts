import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import type { PicsumImage } from "@/types/types";
import { LIST_IMAGE_URL } from "@/utils/urls";

const usePlaceholderImages = (page: number, perPage: number) => {
  const url = useMemo(() => `${LIST_IMAGE_URL}?page=${page}&limit=${perPage}`, [page, perPage]);
  const { data, isLoading } = useFetch<PicsumImage[]>(url);
  return { picsumImages: data || [], isLoading };
};

export default usePlaceholderImages;
