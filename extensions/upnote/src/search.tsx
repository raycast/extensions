import { LaunchProps, open } from "@raycast/api";

interface SearchArguments {
  query: string;
}

export default async function Command(props: LaunchProps<{ arguments: SearchArguments }>) {
  const { query } = props.arguments;
  const url = `upnote://x-callback-url/view?action=search&query=${encodeURIComponent(query)}`;
  await open(url);
}
