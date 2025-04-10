import { LaunchProps, open } from "@raycast/api";
import { makeSearchURL } from "./utils/url";

export default async (props: LaunchProps) => {
  try {
    const { query } = props.arguments;
    const searchURL = makeSearchURL(query || props.fallbackText);
    await open(searchURL);
  } catch (error) {
    console.error("Error opening Google Maps:", error);
    throw error;
  }
};
