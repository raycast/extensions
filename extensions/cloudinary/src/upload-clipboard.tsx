import { useEffect, useState } from "react";
import { showToast, Toast, Clipboard } from "@raycast/api";
import fileUriToPath from "file-uri-to-path";

import { uploadImage } from "./lib/cloudinary";
import type { Asset } from "./types/asset";

import ViewResource from "./components/ViewResource";

export default function main() {
  const [asset, setAsset] = useState<Asset>();
  const [loading, setLoading] = useState(false);

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
        setAsset(resource as Asset);
      } catch (e) {
        console.log(e);
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
