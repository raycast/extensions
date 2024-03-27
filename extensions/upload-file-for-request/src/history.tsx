import { Action, ActionPanel, Icon, List, LocalStorage, showHUD, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import path from "path";
import { ImageMeta } from "./common/type";

import { ImageDetailMetadata } from "./common/image-detail-metadat";
import { isImage } from "./common/util";

export default function ViewHistoryCommand() {
  const [images, setImages] = useState<ImageMeta[] | null>(null);
  useEffect(() => {
    const load = async () => {
      const images = await LocalStorage.allItems();
      setImages(
        Array.from(Object.values(images))
          .map((image) => JSON.parse(image))
          .sort((a, b) => b.createdAt - a.createdAt),
      );
    };

    load();
  }, []);

  const deleteImage = useCallback(async (image: ImageMeta) => {
    showToast({ title: "Deleting..." });
    await LocalStorage.removeItem(image.hash);
    showHUD("Image deleted successfully");
  }, []);

  return (
    <List isShowingDetail={!!images?.length}>
      {images ? (
        images.map((image) => {
          const imageFileName = path.basename(image.source);
          const markdown = isImage(image.format) ? `![Image Title](${image.url})` : `# The resource is not an image`;
          return (
            <List.Item
              key={image.hash}
              title={imageFileName}
              icon={image.from === "clipboard" ? "SolarClipboardOutline.svg" : "SolarFileTextLinear.svg"}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    icon={Icon.CopyClipboard}
                    title="Copy Image CDN URL to Clipboard"
                    content={image.url}
                  />
                  <Action.OpenInBrowser url={image.url} />
                  <Action
                    title="Delete Image"
                    shortcut={{
                      modifiers: ["cmd"],
                      key: "backspace",
                    }}
                    icon={Icon.DeleteDocument}
                    onAction={() => deleteImage(image)}
                  />
                </ActionPanel>
              }
              detail={<List.Item.Detail markdown={markdown} metadata={<ImageDetailMetadata image={image} />} />}
            />
          );
        })
      ) : (
        <List.EmptyView />
      )}
    </List>
  );
}
