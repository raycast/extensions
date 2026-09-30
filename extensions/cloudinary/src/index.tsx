import { List, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import fileUriToPath from "file-uri-to-path";

import { uploadImage, getImageUrl } from "./lib/cloudinary";

import type { Asset } from "./types/asset";

export default function main() {
  const [asset, setAsset] = useState<Asset>();
  const [loading, setLoading] = useState(false);

  const urlOptimized =
    asset?.public_id &&
    getImageUrl(asset.public_id, {
      quality: "auto",
      fetch_format: "auto",
    });

  const urlBackgroundRemoved =
    asset?.public_id &&
    getImageUrl(asset.public_id, {
      effect: "background_removal",
      quality: "auto",
      fetch_format: "auto",
    });

  useEffect(() => {
    (async function run() {
      setLoading(true);

      try {
        const { file } = await Clipboard.read();

        if (typeof file === "undefined") {
          throw new Error("Missing image data.");
        }

        const filePath = fileUriToPath(file);
        const resource = await uploadImage(filePath);
        const asset = Object.fromEntries(Object.entries(resource).filter(([key]) => key !== "api_key"));
        setAsset(asset as Asset);
      } catch (e) {
        displayError("Failed to upload clipboard data to Cloudinary");
      }

      setLoading(false);
    })();
  }, []);

  /**
   * displayError
   */

  function displayError(message: string) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: message,
    });
  }

  return (
    <>
      <List isShowingDetail isLoading={loading}>
        {urlOptimized && (
          <>
            <List.Item
              title="Optimized"
              icon="url.png"
              actions={<Actions item={{ content: urlOptimized }} />}
              detail={<List.Item.Detail markdown={`![Uploaded Image](${urlOptimized})`} />}
            />
          </>
        )}
        {urlOptimized && urlBackgroundRemoved && (
          <List.Item
            title="Background Removed"
            icon="url.png"
            actions={<Actions item={{ content: urlBackgroundRemoved }} />}
            detail={<List.Item.Detail markdown={`![Uploaded Image](${urlOptimized})`} />}
          />
        )}
      </List>
    </>
  );
}

type ActionItem = {
  item: {
    content: string;
  };
};

function Actions({ item }: ActionItem) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard content={item.content} />
    </ActionPanel>
  );
}
