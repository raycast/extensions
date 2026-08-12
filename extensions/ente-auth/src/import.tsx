import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { DEFAULT_EXPORT_DIR_PATH, getExportFilePath } from "./constants/ente";
import { checkEnteBinary, createEntePath, deleteEnteExport, exportEnteAuthSecrets } from "./helpers/ente";
import { getSecrets, parseSecrets, storeSecrets } from "./helpers/secrets";

export default async function Command() {
	const toast = await showToast({ style: Toast.Style.Animated, title: "Importing secrets" });

	if (!checkEnteBinary()) {
		toast.style = Toast.Style.Failure;
		toast.title = "Ente binary not found";
		toast.message = "Please install the Ente binary.";
		return;
	}
	const exportDirPath = DEFAULT_EXPORT_DIR_PATH();
	const exportFilePath = getExportFilePath(exportDirPath);

	try {
		createEntePath(exportDirPath);
		exportEnteAuthSecrets(exportDirPath);
	} catch (error) {
		console.warn("Export failed, proceeding with existing file:", error);
	}

	try {
		const secrets = parseSecrets(getSecrets(exportFilePath));
		await storeSecrets(secrets);

		toast.style = secrets.length > 0 ? Toast.Style.Success : Toast.Style.Failure;
		toast.title = secrets.length > 0 ? `${secrets.length} secrets imported!` : "No secrets found";
		toast.message = secrets.length > 0 ? "" : "Please check your export path";
	} catch (error) {
		toast.style = Toast.Style.Failure;
		toast.title = "Error importing secrets";
		toast.message = error instanceof Error ? error.message : "Unknown error";
	}
	if (getPreferenceValues<Preferences>().deleteExport === true) {
		await deleteEnteExport(exportFilePath);
	}
}
