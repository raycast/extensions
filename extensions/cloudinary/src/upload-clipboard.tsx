import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { storeClipboardToTemp } from "./lib/util";
import { uploadImage } from "./lib/cloudinary";
import { getUploadSuccessItems } from "./lib/extension";

import type { Asset } from "./types/asset";

export default function main() {
  const [asset, setAsset] = useState<Asset>();
  const [loading, setLoading] = useState(false);

  const listItems = asset && getUploadSuccessItems(asset);

  useEffect(() => {
    (async function run() {
      setLoading(true);

      try {
        const filePath = storeClipboardToTemp();
        const resource = await uploadImage(filePath);
        setAsset(resource as Asset);
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
        {listItems?.map((item) => {
          return (
            <List.Item
              key={item.title}
              title={item.title}
              icon={item.icon}
              actions={<Actions item={{ content: item.assetUrl }} />}
              detail={<List.Item.Detail markdown={item.detail} />}
            />
          );
        })}
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
