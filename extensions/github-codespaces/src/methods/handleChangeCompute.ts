import { personalAccessToken } from "../preferences";
import { Codespace, Machine } from "../types";
import { default as nodeFetch } from "node-fetch";
import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";

const handleChangeCompute = async ({
  codespace,
  machine,
}: {
  codespace: Codespace;
  machine: Machine;
}) => {
  const toast = await showToast({
    title: `Changing compute to ${machine.display_name}...`,
    style: Toast.Style.Animated,
  });
  try {
    const response = await nodeFetch(`${codespace.url}`, {
      method: "PATCH",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${personalAccessToken}`,
      },
      body: JSON.stringify({
        machine: machine.name,
      }),
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
      await showHUD("Request sent. Compute change may take a few minutes.");
    }
  } catch (error) {
    console.log(error);
    toast.style = Toast.Style.Failure;
    toast.title =
      typeof error === "string" ? error : "Failed to change compute";
  }
};

export default handleChangeCompute;
