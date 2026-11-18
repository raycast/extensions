import { AI, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fetchModels } from "./models";

export default async function Command() {
  try {
    const { models, staleReason } = await fetchModels();
    await AI.refreshModels();
    if (staleReason) {
      await showToast({ style: Toast.Style.Failure, title: "Using cached Command Code models", message: staleReason });
      return;
    }
    await showHUD(`Refreshed ${models.length} Command Code models`);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to refresh models" });
  }
}
