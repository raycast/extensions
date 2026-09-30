import {
  Alert,
  confirmAlert,
  Icon,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { personalAccessToken } from "../preferences";
import { Codespace } from "../types";
import { default as nodeFetch } from "node-fetch";

const handleDelete = async ({ codespace }: { codespace: Codespace }) => {
  if (
    await confirmAlert({
      title: `Are you sure you want to delete ${codespace.display_name}?`,
      message: codespace.git_status.has_uncommitted_changes
        ? codespace.git_status.has_unpushed_changes
          ? `You have ${codespace.git_status.ahead} unpushed commits as well as other uncommitted changes that will be lost forever.`
          : `You have uncommitted changes that will be lost forever.`
        : codespace.git_status.has_unpushed_changes
        ? `You have ${codespace.git_status.ahead} unpushed commits that will be lost forever.`
        : undefined,
      icon: Icon.Trash,
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    })
  ) {
    const toast = await showToast({
      title: `Deleting ${codespace.display_name}...`,
      style: Toast.Style.Animated,
    });
    try {
      const response = await nodeFetch(`${codespace.url}`, {
        method: "DELETE",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${personalAccessToken}`,
        },
      });
      await response.json();
      await toast.hide();
      await showHUD("Successfully deleted");
    } catch (error) {
      console.log(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete codespace";
    }
  }
};

export default handleDelete;
