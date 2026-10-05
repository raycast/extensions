import { LaunchProps, closeMainWindow, open } from "@raycast/api";
import { THREADS_BASE_URL } from "./lib/constants";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Search }>) {
  const url = `${THREADS_BASE_URL}/search`;
  const params = new URLSearchParams();
  const { query, sort } = props.arguments;
  if (query) params.append("q", query);
  if (sort) params.append("filter", sort);
  await closeMainWindow();
  open(url + "?" + params.toString());
}
