import { ActionPanel, Action, Image, Grid } from "@raycast/api";
import { countOf, onErrorToast } from "@chrismessina/raycast-kit";
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
        imageUrl: "https://skin.laby.net/api/render/cape/%s.png?shadow=true&height=300&width=250",
        url: "https://laby.net/cape/%s",
      }
    : {
        imageUrl: "https://skin.laby.net/api/render/skin/%s.png?shadow=true&height=300&width=250",
        url: "https://laby.net/skin/%s",
      };
  const [query, setQuery] = useState("");
  const abortable = useRef<AbortController | null>(null);
  const input = isCapeSearch ? "" : query;
  const search = useCallback(async (type: string, input: string) => {
    const result = await service.searchTextures(type, input, abortable.current?.signal);
    return result.textures;
  }, []);
  const { data: results, isLoading } = useCachedPromise(search, [type, input], {
    abortable,
    initialData: [],
    keepPreviousData: false,
    onError: onErrorToast({ title: "Error searching textures" }),
  });

  return (
    <Grid
      isLoading={isLoading}
      throttle={true}
      aspectRatio={"3/4"}
      columns={6}
      searchBarPlaceholder={isCapeSearch ? "Search capes" : "Search skins"}
      onSearchTextChange={isCapeSearch ? undefined : (query) => setQuery(query.trim())}
    >
      {results.map((entry: TextureSearchTexture) => {
        const userCount = countOf(entry.useCount, "user");
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
      })}
    </Grid>
  );
}
