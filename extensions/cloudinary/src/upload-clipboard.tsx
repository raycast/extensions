import { Clipboard } from "@raycast/api";
import fileUriToPath from "file-uri-to-path";

import { uploadImage } from "./lib/cloudinary";
import type { Asset } from "./types/asset";

import ViewResource from "./components/ViewResource";
import { showFailureToast, usePromise } from "@raycast/utils";

export default function main() {
  const { isLoading, data: asset } = usePromise(
    async () => {
      const { file } = await Clipboard.read();

      if (typeof file === "undefined") {
        throw new Error("Missing image data.");
      }

      const filePath = fileUriToPath(file);

      const resource = await uploadImage(filePath);
      return resource as Asset;
    },
    [],
    {
      onError(error) {
        const message =
          typeof error.message === "string" ? error.message : "Failed to upload clipboard data to Cloudinary";
        showFailureToast(message, { title: "Error" });
      },
    },
  );

  return <ViewResource resource={asset} isLoading={isLoading} />;
}
