import { LaunchProps } from "@raycast/api";

import { uploadImage } from "./lib/cloudinary";
import type { Asset } from "./types/asset";

import ViewResource from "./components/ViewResource";
import { showFailureToast, usePromise } from "@raycast/utils";

export default function main(props: LaunchProps<{ arguments: Arguments.UploadUrl }>) {
  const { isLoading, data: asset } = usePromise(
    async () => {
      const resource = await uploadImage(props.arguments.url);
      return resource as Asset;
    },
    [],
    {
      onError() {
        showFailureToast("Failed to upload url data to Cloudinary", { title: "Error" });
      },
    },
  );

  return <ViewResource resource={asset} isLoading={isLoading} />;
}
