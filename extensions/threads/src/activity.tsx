import { LaunchProps, closeMainWindow, open } from "@raycast/api";
import { THREADS_BASE_URL } from "./lib/constants";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Activity }>) {
  const { page } = props.arguments;
  const url = page && page !== "all" ? `${THREADS_BASE_URL}/activity/${page}` : `${THREADS_BASE_URL}/activity/`;

  await closeMainWindow();
  await open(url);
}
