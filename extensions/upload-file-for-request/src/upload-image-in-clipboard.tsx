import { ActionPanel, Action, Clipboard, Detail, Icon, openExtensionPreferences, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFile, isImage, uploadFile } from "./common/util";
import { ImageDetailMetadata } from "./common/image-detail-metadat";
import { ImageMeta } from "./common/type";
import { imageMeta } from "image-meta";

type StateType = {
  status: "initial" | "no-input" | "image-format-invalid" | "canceled" | "error" | "succeed";
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
      let { file: image } = await Clipboard.read();
      if (image) {
        image = decodeURIComponent(image);

        if (image.startsWith("file://")) {
          image = image.slice(7);
        }
        const { fileBuffer, fileName, fileExt, hash, type } = await getFile(image);
        if (!isImage(type)) {
          setState({
            status: "error",
            message: "Input is not an image",
          });
          return;
        }
        const meta = await imageMeta(fileBuffer);
        if (!meta?.type) {
          setState({
            status: "image-format-invalid",
            message: "",
          });
          return;
        }

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
            from: "clipboard",
            source: image,
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
      } else {
        setState({
          status: "error",
          message: "Input is not an image",
        });
        return;
      }
    };
    loadMedia();
  }, []);

  const navigationTitle =
    state.status === "error" ? "Failed to upload" : state.status === "initial" ? "Uploading" : "Uploaded successfully";
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
