import { showToast, Toast, open } from "@raycast/api";
import { getTextDifferApplication } from "./getTextDifferApplication";

export async function checkTextDifferInstallation() {
  const applicationData = await getTextDifferApplication();
  if (!applicationData) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Text Differ is not installed.",
      message: "Install it from: https://proxymanstore.gumroad.com/l/textdiffer",
      primaryAction: {
        title: "Go to https://proxymanstore.gumroad.com/l/textdiffer",
        onAction: (toast) => {
          open("https://proxymanstore.gumroad.com/l/textdiffer");
          toast.hide();
        },
      },
    };

    await showToast(options);
    return;
  }
  return applicationData;
}
