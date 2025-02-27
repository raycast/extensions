import { LaunchProps, open } from "@raycast/api";

export default async function openInBrowser(props: LaunchProps<{ arguments: Arguments.OpenInBrowser }>) {
  if (!props.arguments.query) {
    await open("https://exa.ai/search");
  } else {
    await open(`https://exa.ai/search?q=${encodeURIComponent(props.arguments.query)}`);
  }
}
