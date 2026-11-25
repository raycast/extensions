import { ActionPanel, Action, Icon, Image, Grid } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import Service, { TextureSearchTexture } from "./service";

const service = new Service();

interface TextureSearchProps {
  type: "SKIN" | "CAPE";
}

export function TextureSearch({ type }: TextureSearchProps) {
  const isCapeSearch = type === "CAPE";
  const textureType = isCapeSearch
    ? {
        imageUrl: "https://laby.net/api/v3/render/cape/%s.png?shadowBlur=true&width=250&height=300",
        url: "https://laby.net/cape/%s",
      }
    : {
        imageUrl: "https://laby.net/api/v3/render/skin/%s.png?shadowBlur=true&width=250&height=300",
        url: "https://laby.net/skin/%s",
      };
  const [query, setQuery] = useState("");
  const abortable = useRef<AbortController | null>(null);
  const search = useCallback(async (type: string, input: string) => {
    const result = await service.searchTextures(type, input, abortable.current?.signal);
    return result.textures;
  }, []);
  const {
    data: results,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(search, [type, query], {
    abortable,
    initialData: [],
    keepPreviousData: true,
    failureToastOptions: { title: "Error searching textures" },
  });

  return (
    <Grid
      isLoading={isLoading}
      throttle={true}
      aspectRatio={"3/4"}
      columns={6}
      searchBarPlaceholder={isCapeSearch ? "Search capes" : "Search skins"}
      onSearchTextChange={(query) => setQuery(query.trim())}
    >
      {error ? (
        <Grid.EmptyView
          title="Couldn't load textures"
          description="Check your connection and try again."
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        results.map((entry: TextureSearchTexture) => {
          const userCount = `${entry.useCount.toLocaleString()} ${entry.useCount === 1 ? "user" : "users"}`;
          return (
            <Grid.Item
              content={{
                source: textureType.imageUrl.replace("%s", entry.imageHash),
                mask: Image.Mask.RoundedRectangle,
              }}
              key={entry.imageHash}
              title={entry.name === undefined ? userCount : entry.name}
              subtitle={entry.name === undefined ? "" : userCount}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={textureType.url.replace("%s", entry.imageHash)} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </Grid>
  );
}
