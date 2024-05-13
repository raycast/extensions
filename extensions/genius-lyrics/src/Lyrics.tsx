import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { load } from "cheerio";

export default function Lyrics({ url }: { url: string }) {
  const { data, isLoading } = useFetch<string>(url, {
    keepPreviousData: true,
  });

  const $ = load(data || "");
  $("br").text("\n\n")
  const text = $("[data-lyrics-container=true]").text()

  return <Detail isLoading={isLoading} markdown={text} />;
}
