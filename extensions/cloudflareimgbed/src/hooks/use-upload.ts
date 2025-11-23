import { showToast, Toast } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { ImgBedClient } from "../api/client";
import { getPreferenceValues } from "@raycast/api";
import type { ImgBedPreferences } from "../types/preferences";
import type { UploadOptions } from "../api/interfaces";

export function useUpload() {
  const prefs = useMemo(() => getPreferenceValues<ImgBedPreferences>(), []);
  const client = useMemo(() => new ImgBedClient(prefs), [prefs]);

  const upload = useCallback(
    async (options: UploadOptions) => {
      const toast = await showToast(Toast.Style.Animated, "Uploading...");
      try {
        const url = await client.uploadImage(options);
        toast.style = Toast.Style.Success;
        toast.title = "Uploaded successfully";
        toast.message = url;
        return url;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Upload failed";
        toast.message = (error as Error).message;
        throw error;
      }
    },
    [client],
  );

  return { upload, preferences: prefs };
}
