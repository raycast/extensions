import { showToast, Toast } from "@raycast/api";
import { downloadDatasets, TOTAL_BYTES } from "./offline";

const mb = (bytes: number) => (bytes / 1_000_000).toFixed(1);

export async function downloadWithToast(dir: string): Promise<boolean> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading dictionaries",
    message: `0 of ${mb(TOTAL_BYTES)} MB`,
  });
  try {
    const built = await downloadDatasets(dir, (bytes) => {
      toast.message = `${mb(bytes)} of ${mb(TOTAL_BYTES)} MB`;
    });
    toast.style = Toast.Style.Success;
    toast.title = "Ready";
    toast.message = `${built.synonyms.toLocaleString()} words with synonyms, ${built.definitions.toLocaleString()} defined`;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download failed";
    toast.message = String(error);
    return false;
  }
}
