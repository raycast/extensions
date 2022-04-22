import useSWR from "swr";
import fs from "fs";
import { getItemThumbnail } from "./api";

export function useThumbnail(id: string, ext: string) {
  return useSWR(`/api/item/thumbnail?id=${id}`, async () => {
    const res = await getItemThumbnail(id);
    const imagePath = decodeURIComponent(res.data.data);

    const content = fs.readFileSync(imagePath, { encoding: "base64" });

    const base64Url = `data:image/${ext};base64,${content}`;
    return base64Url;
  });
}
