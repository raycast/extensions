import { ActionPanel, Action, Detail, Icon, openExtensionPreferences, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFile, getFinderSelectedImages, isImage, uploadFile } from "./common/util";
import { ImageDetailMetadata } from "./common/image-detail-metadat";
import { ImageMeta } from "./common/type";
import { imageMeta } from "image-meta";

type StateType = {
  status: "initial" | "no-selected-image" | "image-format-invalid" | "canceled" | "error" | "succeed";
  message: string;
  cache?: boolean;
  image?: ImageMeta;
};
export default function Command() {
  const [state, setState] = useState<StateType>({
    status: "initial",
    message: "**uploading...**",
  });
  useEffect(() => {
    const loadMedia = async () => {
      const selectedImages = await getFinderSelectedImages();
      if (selectedImages.length === 0) {
        setState({
          status: "error",
          message: "No images selected in the Finder app",
        });
        return;
      }

      const image = selectedImages[0];
      const { fileBuffer, fileName, fileExt, hash, type } = await getFile(image.path);
      if (!isImage(type)) {
        setState({
          status: "error",
          message: "Selected is not an image",
        });
        return;
      }
      const meta = await imageMeta(fileBuffer);
      console.log("image", { image, type, hash });

      const record = await LocalStorage.getItem<string>(hash);
      if (record) {
        const cacheImg = JSON.parse(record) as ImageMeta;
        setState({
          status: "succeed",
          message: `![Image Title](${cacheImg.url})`,
          cache: true,
          image: cacheImg,
        });
        return;
      } else {
        const url = await uploadFile(fileBuffer, fileName, fileExt);
        const newRecord: ImageMeta = {
          hash,
          from: "finder",
          source: image.path,
          format: type,
          url,
          size: fileBuffer.length,
          height: meta.height,
          width: meta.width,
          createdAt: Date.now(),
        };

        await LocalStorage.setItem(hash, JSON.stringify(newRecord));

        setState({
          status: "succeed",
          cache: false,
          message: `![Image Title](${url})`,
          image: newRecord,
        });
      }
    };
    loadMedia();
  }, []);

  const navigationTitle =
    state.status === "error" ? "Failed to upload" : state.status === "initial" ? "Uploading" : "Uploaded successfully";

  console.log("state.message", state.message, navigationTitle);
  return (
    <Detail
      markdown={state.message}
      navigationTitle={navigationTitle}
      isLoading={state.status === "initial"}
      metadata={state.status === "succeed" ? <ImageDetailMetadata image={state.image!} /> : null}
      actions={
        state.status === "succeed" ? (
          <ActionPanel>
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              title="Copy Image CDN URL to Clipboard"
              content={state.image!.url}
            />
            <Action.OpenInBrowser url={state.image!.url} />
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              title="Copy Markdown Content to Clipboard"
              content={`![image from clipboard](${state.image!.url})`}
            />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        ) : state.status === "error" ? (
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        ) : null
      }
    />
  );
}
