import { closeMainWindow, LaunchProps, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getWorkspaceUrl } from "./composables/WebClient";

export default async function Command({ arguments: { prompt } }: LaunchProps<{ arguments: Arguments.NewAiThread }>) {
  try {
    const url = new URL("/ai", await getWorkspaceUrl());
    if (prompt?.trim()) {
      url.search = `?prompt=${encodeURIComponent(prompt)}`;
    }

    await open(url.toString());
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open awork AI" });
  }
}
