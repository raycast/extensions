import { AI, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fetchCatalog } from "./models";

export default async function Command() {
  try {
    const { version, models } = await fetchCatalog();
    await AI.refreshModels();
    await showHUD(`Refreshed ${models.length} CommandCode models (v${version})`);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to refresh models" });
  }
}
