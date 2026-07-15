import { confirmAlert } from "@raycast/api";
import { DEFAULT_EXPORT_DIR_PATH, getExportFilePath } from "./constants/ente";
import { deleteEnteExport } from "./helpers/ente";

export default async function Command() {
	let deleteFile = false;

	if (await confirmAlert({ title: "Do you want to delete the export file?" })) {
		deleteFile = true;
	} else {
		return;
	}

	if (deleteFile) {
		await deleteEnteExport(getExportFilePath(DEFAULT_EXPORT_DIR_PATH()));
	}
}
