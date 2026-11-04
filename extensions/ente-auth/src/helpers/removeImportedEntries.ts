import { Alert, Toast, confirmAlert, showToast } from "@raycast/api";

export async function removeImportedEntries(remove: () => Promise<void> | undefined): Promise<void> {
	if (
		!(await confirmAlert({
			title: "Remove imported entries?",
			message:
				"This removes only the entries saved by Import Secrets. It does not remove export files or cloud entries.",
			primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
		}))
	) {
		return;
	}

	try {
		await remove();
		await showToast({ style: Toast.Style.Success, title: "Imported entries removed" });
	} catch {
		await showToast({ style: Toast.Style.Failure, title: "Imported entries could not be removed" });
	}
}
