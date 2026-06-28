import { closeMainWindow, getPreferenceValues, LaunchProps, Toast } from "@raycast/api";

import { createBookmark, getLinkTitle } from "./helpers/utils";

export default async function QuickAddBookmark(props: LaunchProps<{ arguments: Arguments.QuickAdd }>) {
  const toast = new Toast({ style: Toast.Style.Animated, title: "Saving bookmark..." });
  await toast.show();

  try {
    const preferences = getPreferenceValues<Preferences>();
    const url = (props.arguments?.url ?? props.fallbackText)?.trim();

    if (!url) {
      throw new Error("URL is required");
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error("Invalid URL");
    }

    // Auto-fetch title
    const title = await getLinkTitle(url);

    // Create bookmark in Unsorted collection (-1)
    const response = await createBookmark({
      preferences,
      values: {
        link: url,
        title: title || url,
        collection: "-1", // Unsorted
        tags: [],
      },
      showCollectionCreation: false,
    });

    if (!response.ok) {
      throw new Error("Failed to save bookmark");
    }

    toast.style = Toast.Style.Success;
    toast.title = "Bookmark saved";
    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save bookmark";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
