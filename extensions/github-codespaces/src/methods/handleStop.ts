import { personalAccessToken } from "../preferences";
import { Codespace } from "../types";
import { default as nodeFetch } from "node-fetch";
import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";

export const handleStop = async ({ codespace }: { codespace: Codespace }) => {
  const toast = await showToast({
    title: `Stopping ${codespace.display_name || "codespace"}...`,
    style: Toast.Style.Animated,
  });
  try {
    const response = await nodeFetch(`${codespace.stop_url}`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${personalAccessToken}`,
      },
    });
    if (response.status !== 200) {
      const data = (await response.json()) as {
        message: string;
        documentation_url: string;
      };
      toast.style = Toast.Style.Failure;
      toast.title = data.message;
      toast.primaryAction = {
        title: "Copy link to docs",
        onAction: () => {
          Clipboard.copy(data.documentation_url);
        },
      };
    } else {
      await toast.hide();
      await showHUD("Codespace stopped");
    }
  } catch (error) {
    console.log(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to change name";
  }
};
