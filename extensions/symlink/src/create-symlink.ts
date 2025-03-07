import { showHUD, getSelectedFinderItems } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs/promises";
import * as path from "path";

export default async function main() {
	const files = await getSelectedFinderItems().catch(async (error) => {
		await showFailureToast(error, { title: "Cannot create symlink" });
		return undefined;
	});

	if (!files) return;

	if (!files.length) {
		await showFailureToast("No files selected.", { title: "Cannot create symlink" });
		return;
	}

	for (const file of files) {
		const directory = path.dirname(file.path);
		const extension = path.extname(file.path);
		const basename = path.basename(file.path, extension);

		try {
			const newName = await suggestAvailableName(directory, basename + " symlink", extension);
			const newPath = path.join(directory, newName);
			await fs.symlink(file.path, newPath);
			await showHUD(`Created symlink: ${newName}`);
		} catch (error) {
			await showFailureToast(error, {
				title: "Failed to create symlink",
			});
			return;
		}
	}
}

async function suggestAvailableName(directoryPath: string, idealName: string, extension: string) {
	let suffix = 0;

	while (suffix < 1000) {
		const newName = idealName + (suffix === 0 ? "" : ` ${suffix}`) + extension;

		const newPath = `${directoryPath}/${newName}`;

		const exists = await fs
			.stat(newPath)
			.then(() => true)
			.catch(() => false);
		if (!exists) return newName;

		suffix++;
	}

	throw new Error("Could not find an available name");
}
