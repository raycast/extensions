import {
  showToast,
  Toast,
  LaunchProps,
  openExtensionPreferences,
  showHUD,
  closeMainWindow,
  popToRoot,
} from "@raycast/api";
import { addLink } from "./utils/graphql";

interface Arguments {
  url: string;
}

// Function to validate URL
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export default async function AddLinkCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const url = props.arguments?.url || "";

  try {
    // If no URL provided as argument, prompt user
    if (!url.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "URL Required",
        message: "Please provide a URL as an argument",
      });
      return;
    }

    // Validate URL format
    if (!isValidUrl(url)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Please provide a valid URL (e.g., https://example.com)",
      });
      return;
    }

    // Show loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Adding link...",
      message: "Saving to your Stacks collection",
    });

    // Add the link
    await addLink({
      target_url: url.trim(),
    });

    // Hide the loading toast first
    await showToast({
      style: Toast.Style.Success,
      title: "Link added!",
      message: "Successfully saved to Stacks",
    });

    // Brief delay to let the success toast show before closing
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate to root and close window
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();

    // Show success HUD
    await showHUD("Link added to Stacks");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Handle authentication errors specifically
    const isTokenError = ["api token", "authentication failed", "sign in again", "invalid api token"].some((tokenMsg) =>
      errorMessage.toLowerCase().includes(tokenMsg),
    );
    if (isTokenError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid or Expired API Token",
        message: "Your Stacks API token is invalid or expired. Please update it in Preferences.",
        primaryAction: {
          title: "Open Extension Preferences",
          onAction: () => {
            openExtensionPreferences();
          },
        },
      });
      return;
    }

    // Show error toast with better message
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to add link",
      message: errorMessage,
    });
  }
}
