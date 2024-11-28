import { LaunchProps } from "@raycast/api";
import open from "open";
import { makeSearchURL } from "./utils";

export default async (props: LaunchProps) => {
  const { query } = props.arguments;
  const searchURL = makeSearchURL(query || props.fallbackText);
  open(searchURL);
};
