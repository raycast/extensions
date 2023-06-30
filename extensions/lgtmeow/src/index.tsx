import { ActionPanel, List, Action } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import fetch from "node-fetch";

const Command = () => {
  const [state, setState] = useState<ImageState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);
  cancelRef.current?.abort();
  cancelRef.current = new AbortController();

  useEffect(() => {
    if (!cancelRef.current) return;
    fetchImages(cancelRef.current.signal);
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  const fetchImages = async (signal: AbortSignal) => {
    const response = await fetch("https://lgtm-cat-bff.lgtmeow.workers.dev/lgtm-images", {
      method: "get",
      signal: signal,
    });
    if (!response.ok) {
      return Promise.reject(response.statusText);
    }
    const json = (await response.json()) as Response;
    const images = json.lgtmImages as Image[];

    setState((prev) => ({
      ...prev,
      results: images,
      isLoading: false,
    }));
  };

  return (
    <List isLoading={state.isLoading} isShowingDetail>
      <List.Item
        key={"reload"}
        title={"Refresh  ⌘ R"}
        actions={
          <ActionPanel>
            <Action
              title="Refresh Result"
              onAction={() => {
                if (cancelRef.current) {
                  fetchImages(cancelRef.current.signal);
                }
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
      {state.results.map((result) => (
        <List.Item
          key={result.imageUrl}
          title={result.imageUrl}
          detail={imagePreview(result.imageUrl)}
          icon={result.imageUrl}
          actions={
            <ActionPanel>
              {pasteActionMarkdown(result.imageUrl)}
              {pasteAction(result.imageUrl)}
              <Action
                title="Refresh Result"
                onAction={() => {
                  if (cancelRef.current) {
                    fetchImages(cancelRef.current.signal);
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default Command;

const imagePreview = (url: string) => {
  return <List.Item.Detail markdown={`![LGTM](${url})`} />;
};

const pasteActionMarkdown = (url: string) => {
  return <Action.Paste title="Paste as Markdown" content={`![LGTM](${url})`} />;
};

const pasteAction = (url: string) => {
  return <Action.Paste title="Paste as Url" content={`${url}`} shortcut={{ modifiers: ["cmd"], key: "enter" }} />;
};

type ImageState = {
  results: Image[];
  isLoading: boolean;
};

type Response = {
  lgtmImages: Image[];
};

type Image = {
  imageUrl: string;
  id: number;
};
