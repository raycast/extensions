import useSWR from "swr";
import { getItemThumbnail, getApplicationInfo } from "./api";
import { fromPathToBase64Url } from "./base64";

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
