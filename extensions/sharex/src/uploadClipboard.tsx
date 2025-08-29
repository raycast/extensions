import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";

type Preferences = { sharexPath: string };

export default async function Command() {
  const { sharexPath } = getPreferenceValues<Preferences>();

  const useContentViewer = getPreferenceValues<{ useContentViewer: boolean }>().useContentViewer;
  const val = useContentViewer ? "-ClipboardUploadWithContentViewer" : "-ClipboardUpload"; //lol

  if (!sharexPath) {
    await showToast({ style: Toast.Style.Failure, title: "ShareX path not set" });
    return;
  }

  execFile(sharexPath, [val], (error) => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Error running sharex", message: error.message });
    } else {
      showToast({ style: Toast.Style.Success, title: "Upload worked" });
    }
  });
}
