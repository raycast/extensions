import { open, showToast, Toast } from "@raycast/api";
import { isFileZillaInstalled, openSiteManager } from "./utils";

export default async () => {
  const is_filezilla_installed = await isFileZillaInstalled();

  if (!is_filezilla_installed) {
    showToast({
      title: "FileZilla is not installed",
      message: "Install it from the official website",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Go to FileZilla website",
        onAction: async () => await open("https://filezilla-project.org/"),
      },
    });
    return;
  }

  openSiteManager();
};
