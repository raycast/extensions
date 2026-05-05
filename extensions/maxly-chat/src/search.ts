import { LaunchProps, open, showToast, Toast } from "@raycast/api";

interface SearchArguments {
  query: string;
}

export default async function Command(props: LaunchProps<{ arguments: SearchArguments }>) {
  try {
    const { query } = props.arguments;

    // Open maxly.chat with the query parameter
    await open(`https://maxly.chat/?query=${encodeURIComponent(query)}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open maxly.chat",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
