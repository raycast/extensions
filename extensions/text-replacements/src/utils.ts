import { accessSync, constants, readdirSync, statSync, readFileSync } from "fs";
import untildify from "untildify";
import { join } from "path";

export const downloadsFolder = untildify(`~/Downloads`);

export function getDownloads() {

	const files = readdirSync(downloadsFolder);

	return files
		.filter((file) => !file.startsWith(`.`))
		.map((file) => {
			const path = join(downloadsFolder, file);
			const lastModifiedAt = statSync(path).mtime;
			return { file, path, lastModifiedAt };
		})
		.sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
}

export function getLatestDownload() {

	const downloads = getDownloads();

	if (downloads.length < 1) {
		return undefined;
	}

	return downloads[0];
}

export function getFileContent(path: string) {
	return readFileSync(path, "utf8");
}

export function hasAccessToDownloadsFolder() {
	try {
		accessSync(downloadsFolder, constants.R_OK);
		return true;
	} catch (error) {
		console.error(error);
		return false;
	}
}
