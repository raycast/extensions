import { LaunchProps, open } from "@raycast/api";
import { makePlatformSearchURL } from "./utils";

export default async (props: LaunchProps) => {
  const { query } = props.arguments;

  // Ensure we have a valid query string
  const searchQuery = query || props.fallbackText || "";

  if (!searchQuery.trim()) {
    console.error("No search query provided");
    return;
  }

  const searchURL = makePlatformSearchURL(searchQuery);
  console.log("Opening URL:", searchURL);
  await open(searchURL);
};
