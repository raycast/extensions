import { Action, ActionPanel, Detail, Icon, Keyboard, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ArtworkDetail } from "./components/artwork-detail";
import { getCatalog } from "./lib/catalog";

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(getCatalog);
  const [index, setIndex] = useState<number>();
  const count = data?.artworks.length ?? 0;
  useEffect(() => {
    if (count) setIndex(Math.floor(Math.random() * count));
  }, [count]);
  const artwork = index === undefined ? undefined : data?.artworks[index];
  if (!artwork)
    return (
      <Detail
        isLoading={isLoading}
        markdown={
          error
            ? "# Could not load artworks\n\nCheck your connection and try again."
            : isLoading
              ? ""
              : "# No artworks available"
        }
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  return (
    <ArtworkDetail
      artwork={artwork}
      onSearchColor={(hex) => {
        void launchCommand({ name: "find-art-by-color", type: LaunchType.UserInitiated, context: { hex } }).catch(
          (error) => showFailureToast(error, { title: "Could not open color search" }),
        );
      }}
      extraActions={
        <Action
          title="Another Random Artwork"
          icon={Icon.Shuffle}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() =>
            setIndex((current) => ((current ?? 0) + 1 + Math.floor(Math.random() * Math.max(1, count - 1))) % count)
          }
        />
      }
    />
  );
}
