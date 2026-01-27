import { LaunchProps, showToast, Toast, open } from "@raycast/api";

type SearchArguments = {
  query?: string;
};

export default async function Command(props: LaunchProps<{ arguments: SearchArguments }>) {
  const { query } = props.arguments;

  if (!query || query.trim() === "") {
    await showToast({
      style: Toast.Style.Failure,
      title: "No search query provided",
      message: "Please provide a search query",
    });
    return;
  }

  const searchUrl = `https://developer.planning.center/docs/#/search/${encodeURIComponent(query)}`;
  await open(searchUrl);
}
