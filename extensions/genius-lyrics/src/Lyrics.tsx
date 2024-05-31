import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { load } from "cheerio";

export default function Lyrics({ url, title }: { url: string; title: string }) {
  const { data, isLoading } = useFetch<string>(url, {
    keepPreviousData: true,
  });

  const $ = load(data || "");
  $("br").text("\n\n");
  const text = $("[data-lyrics-container=true]").text();

  return (
    <Detail
      isLoading={isLoading}
      markdown={text}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={url} />
        </ActionPanel>
      }
    />
  );
}
