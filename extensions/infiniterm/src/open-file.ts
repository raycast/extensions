import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getFinderFiles } from "./lib/finder.ts";
import { openFiles } from "./lib/ift.ts";

export default async function Command() {
  try {
    const files = await getFinderFiles();
    if (files.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select a file in Finder first" });
      return;
    }
    await openFiles(files);
  } catch (e) {
    await showFailureToast(e, { title: "Could not read Finder" });
  }
}
