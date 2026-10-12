import { showToast, Toast } from "@raycast/api";
import { CliError } from "./cli";

export async function showError(error: unknown, title: string) {
  const isCli = error instanceof CliError;
  await showToast({
    style: Toast.Style.Failure,
    title: isCli ? error.message : title,
    message: isCli ? error.stderr.slice(0, 300) : error instanceof Error ? error.message : String(error),
  });
}
