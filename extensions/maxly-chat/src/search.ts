import { LaunchProps, open } from "@raycast/api";

interface SearchArguments {
  query: string;
}

export default async function Command(props: LaunchProps<{ arguments: SearchArguments }>) {
  const { query } = props.arguments;

  // Open maxly.chat with the query parameter
  await open(`https://maxly.chat/?query=${encodeURIComponent(query)}`);
}
