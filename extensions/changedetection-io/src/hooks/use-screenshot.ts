import { useFetch } from "@raycast/utils";
import { getUrl, headers } from "@/utils";

export const useScreenshot = (id: string) => {
  const url = getUrl(`static/screenshot/${id}`);

  const { data, isLoading, error } = useFetch<string | null>(url, {
    headers,
    method: "GET",
    parseResponse: (response) => {
      if (response.ok && response.headers.get("Content-Type")?.includes("image/png")) {
        return response.arrayBuffer().then((buffer) => {
          return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
        });
      }
      return Promise.resolve(null);
    },
  });

  if (isLoading || error) {
    return null;
  }

  return data;
};
