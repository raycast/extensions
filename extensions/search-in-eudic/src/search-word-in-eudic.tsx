import { closeMainWindow, getApplications, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";

const eudicBundleIds = ["com.eusoft.freeeudic", "com.eusoft.eudic"];

export async function checkIfInstalledEudic(): Promise<boolean> {
  const installedApplications = await getApplications(); // cost time: 20 ms
  for (const application of installedApplications) {
    const appBundleId = application.bundleId;
    if (appBundleId && eudicBundleIds.includes(appBundleId)) {
      return Promise.resolve(true);
    }
  }
  return Promise.resolve(false);
}

export const openInEudic = (queryText: string) => {
  const url = `eudic://dict/${queryText}`;
  execFile("open", [url], (error) => {
    if (error) {
      console.error(`open in eudic error: ${error}`);
      showToast({
        title: "Eudic is not installed.",
        style: Toast.Style.Failure,
      });
    }
  });
};

const searchWord = async () => {
  const isInstalledEudic = await checkIfInstalledEudic();
  if (!isInstalledEudic) {
    showToast({
      title: 'Eudic is not installed.',
      style: Toast.Style.Failure,
      message: 'Please check if Eudic is installed.'
    })
    return
  }
  let word
  try {
    word = await getSelectedText()
  } catch (error) {
    return
  }
  if (!word) {
    showToast({
      title: 'No selected text.',
      style: Toast.Style.Failure,
      message: `Please select a word.`
    })
    return
  }
  openInEudic(word)
}

export default searchWord
