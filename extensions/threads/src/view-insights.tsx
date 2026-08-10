import { LaunchProps, closeMainWindow, open } from "@raycast/api";
import { THREADS_BASE_URL } from "./lib/constants";

export default async function Command(props: LaunchProps<{ arguments: Arguments.ViewInsights }>) {
  const { period } = props.arguments;
  const url = `${THREADS_BASE_URL}/insights?days=${period || "30"}`;

  await closeMainWindow();
  await open(url);
}
