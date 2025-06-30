import { LaunchProps, open } from "@raycast/api";
import { makeSearchURL } from "./utils/url";

export default async (props: LaunchProps) => {
  const { query } = props.arguments;
  const searchURL = makeSearchURL(query || props.fallbackText);
  open(searchURL);
};
