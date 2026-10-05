import { AI, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fetchCatalog } from "./models";

export default async function Command() {
  try {
    const { version, models, staleReason } = await fetchCatalog();
    await AI.refreshModels();
    if (staleReason) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Using cached CommandCode models (v${version})`,
        message: staleReason,
      });
      return;
    }
    await showHUD(`Refreshed ${models.length} CommandCode models (v${version})`);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to refresh models" });
  }
}
