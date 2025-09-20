import { LaunchProps, closeMainWindow, open } from "@raycast/api";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.Search }>,
) {
  const url = "https://www.threads.net/search";
  const params = new URLSearchParams();
  const { query, sort } = props.arguments;
  if (query) params.append("q", query);
  if (sort) params.append("filter", sort);
  await closeMainWindow();
  open(url + "?" + params.toString());
}
