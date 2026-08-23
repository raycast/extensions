import { LaunchProps, open } from "@raycast/api";
import { getExaSearchUrl } from "./exa";

export default async function openInBrowser(props: LaunchProps<{ arguments: Arguments.OpenInBrowser }>) {
  await open(getExaSearchUrl(props.arguments.query));
}
