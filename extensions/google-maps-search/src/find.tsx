import { LaunchProps, showToast, Toast, open } from "@raycast/api";

// This command has been merged with searchPlaces.tsx
// Redirecting users to the new command

export default function Command({ launchContext, fallbackText }: LaunchProps<{ launchContext: { query: string } }>) {
  // Show a toast informing the user about the change
  showToast({
    style: Toast.Style.Success,
    title: "Command Upgraded",
    message: "Using the improved Search Places command",
  });

  // Open the searchPlaces command with the same query
  const query = launchContext?.query ?? fallbackText;
  open(
    `raycast://extensions/messina/google-maps-search/search-places${query ? `?query=${encodeURIComponent(query)}` : ""}`
  );

  return null;
}
