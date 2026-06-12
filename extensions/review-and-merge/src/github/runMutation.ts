import { showToast, Toast } from "@raycast/api";
import { githubGraphql } from "./client";

export async function runMutation(
  title: string,
  successTitle: string,
  mutation: string,
  variables: Record<string, unknown>,
  onRefresh: () => void,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    await githubGraphql(mutation, variables);
    toast.style = Toast.Style.Success;
    toast.title = successTitle;
    onRefresh();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "GitHub rejected the operation";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
