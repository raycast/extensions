import { LaunchProps, Toast, open, showHUD, showToast } from "@raycast/api";

type CommandArguments = {
  query?: string;
};

const SEARCH_URL = "https://ref.ly/logos4/Search";
const KIND = "AllSearch";
const SYNTAX = "v2";

export default async function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const query = props.arguments.query?.trim();

  if (!query) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Query required",
      message: "Type what you want Logos to search for.",
    });
    return;
  }

  const url = `${SEARCH_URL}?kind=${encodeURIComponent(KIND)}&q=${encodeURIComponent(query)}&syntax=${encodeURIComponent(SYNTAX)}`;

  try {
    await open(url);
    await showHUD("Running All Search in Logos");
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Logos",
      message: `Try this URL in a browser: ${url}`,
    });
  }
}
