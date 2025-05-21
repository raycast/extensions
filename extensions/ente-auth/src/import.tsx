import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { DEFAULT_EXPORT_DIR_PATH, EXPORT_FILE_PATH } from "./constants/ente";
import { checkEnteBinary, createEntePath, deleteEnteExport, exportEnteAuthSecrets } from "./helpers/ente";
import { getSecrets, parseSecrets, storeSecrets } from "./helpers/secrets";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Importing secrets" });

  if (!checkEnteBinary()) {
    showToast(Toast.Style.Failure, "Ente binary not found");
  }

  try {
    createEntePath(DEFAULT_EXPORT_DIR_PATH());
    exportEnteAuthSecrets();

    const secrets = parseSecrets(getSecrets(EXPORT_FILE_PATH));
    await storeSecrets(secrets);

    toast.style = secrets.length > 0 ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = secrets.length > 0 ? `${secrets.length} secrets imported!` : "No secrets found";
    toast.message = secrets.length > 0 ? "" : "Please check your export path";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error importing secrets";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }

  if (getPreferenceValues().deleteExport === true) {
    deleteEnteExport();
  }
}
