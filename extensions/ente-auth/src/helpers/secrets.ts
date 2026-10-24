import { LocalStorage } from "@raycast/api";
import { readFileSync } from "node:fs";
import { STORAGE_KEY } from "../constants/secrets";
import { Secret } from "./types";
import { parseSecretURL } from "./parse-secret";

export const getSecrets = (filePath: string = "ente_auth.txt"): string[] => {
	return readFileSync(filePath, "utf8").split("\n");
};

export const parseSecrets = (rawSecretsURLs: string[]): Secret[] => {
	const secretsList: Secret[] = [];

	rawSecretsURLs.forEach((line) => {
		line = line.trim();

		if (line) {
			try {
				const secret = parseSecretURL(line);

				if (secret) {
					secretsList.push(secret);
				}
			} catch {
				console.error("An import entry could not be read.");
			}
		}
	});

	return secretsList;
};

export const storeSecrets = async (secrets: Secret[]) => {
	await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(secrets));
};
