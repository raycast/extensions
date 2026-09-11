import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import { PostLinkdingBookmarkPayload } from "../types/linkding-types";

export const useCreateBookmark = () => {
  const { serverUrl, apiKey } = useMemo(() => getPreferenceValues<Preferences>(), []);

  const onCreateBookmark = async (payload: PostLinkdingBookmarkPayload) => {
    const toast = await showToast(Toast.Style.Animated, "Creating bookmark");
    try {
      const response = await fetch(`${serverUrl}/api/bookmarks/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Created bookmark";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create bookmark";
      toast.message = String(err);
    }
  };

  return { onCreateBookmark };
};
