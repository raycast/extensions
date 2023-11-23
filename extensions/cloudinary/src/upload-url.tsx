import { useEffect, useState } from "react";
import { showToast, Toast, LaunchProps } from "@raycast/api";

import { uploadImage } from "./lib/cloudinary";
import type { Asset } from "./types/asset";

import ViewResource from "./components/ViewResource";

interface Arguments {
  url?: string;
}

export default function main(props: LaunchProps<{ arguments: Arguments }>) {
  const [asset, setAsset] = useState<Asset>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async function run() {
      if (typeof props?.arguments?.url !== "string") {
        return;
      }

      setLoading(true);

      try {
        const resource = await uploadImage(props.arguments.url);
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

  return <ViewResource resource={asset} isLoading={loading} />;
}
