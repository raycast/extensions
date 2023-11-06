import { Action, ActionPanel, List } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import OpenGraphDetail from "./open-graph-detail";
import { parseOpenGraph } from "./util";
import { OpenGraph } from "./type";
import { showToast, Toast } from "@raycast/api";

export default function Command() {
  const [url, setUrl] = useState<string>("");
  const [openGraph, setOpenGraph] = useState<OpenGraph | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const debounceTimer = setTimeout(() => {
      const fullUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

      try {
        new URL(fullUrl);
      } catch (error) {
        setOpenGraph(null);
        return;
      }

      async function fetchData() {
        setIsLoading(true);
        try {
          const res = await fetch(fullUrl, { signal });
          if (signal.aborted) return;

          if (res.ok) {
            const text = await res.text();
            const openGraph = parseOpenGraph(text);
            setOpenGraph(openGraph);
          } else {
            console.error(`HTTP error: ${res.status}`);
            await showToast({
              style: Toast.Style.Failure,
              title: "Loading Failed",
              message: `Error ${res.status}: Check the URL and try again.`,
            });
            setOpenGraph(null);
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            if (error.name !== "AbortError") {
              console.error(error.message);
              await showToast({
                style: Toast.Style.Failure,
                title: "Can't get open graph information",
                message: "Please check the url and try again.",
              });
              setOpenGraph(null);
            }
          } else {
            console.error(error);
          }
        } finally {
          setIsLoading(false);
        }
      }

      if (url) fetchData();
    }, 300);

    return () => {
      clearTimeout(debounceTimer);
      abortController.abort();
    };
  }, [url]);

  return (
    <List onSearchTextChange={setUrl} isLoading={isLoading}>
      {openGraph ? (
        <List.Item
          title={openGraph?.title || ""}
          icon={{ source: openGraph?.og.image || "" }}
          actions={
            <ActionPanel>
              <Action.Push title={openGraph?.title || ""} target={<OpenGraphDetail openGraph={openGraph} />} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView title="Enter a URL to fetch Open Graph data." />
      )}
    </List>
  );
}
