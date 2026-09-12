import { useFetch } from "@raycast/utils";

export default function useData({ word, languagePair }: { word: string | null; languagePair: string }) {
  return useFetch<string>(
    `https://www.linguee.com/${languagePair}/search?qe=${encodeURIComponent(word || "")}&source=auto`,
    {
      keepPreviousData: true,
      execute: !!word && word.length > 0,
      async parseResponse(response) {
        const raw = Buffer.from(await response.arrayBuffer());
        const headers = response.headers;
        const contentType = headers.get("content-type");
        const text = contentType
          ? raw.toString(contentType.includes("iso-8859-15") ? "latin1" : "utf-8")
          : raw.toString("utf-8");

        return text;
      },
    }
  );
}
