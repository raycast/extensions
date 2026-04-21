import { LocalStorage } from "@raycast/api";
import fse from "fs-extra";
import * as OTPAuth from "otpauth";
import { URL } from "node:url";
import { STORAGE_KEY } from "../constants/secrets";
import { Secret } from "./types";

// Secrets from Blesta seem to end up malformed at times
const sanitizeURL = (url: string): string => {
	// Fix HTML entity + URL encoding corruption (&amp%3B → &)
	url = url.replace(/&amp%3B/g, "&");

	// Fix double URL encoding (%25XX → %XX)
	url = url.replace(/%25([0-9A-Fa-f]{2})/g, "%$1");

	// Strip dashes and plus signs from the secret parameter (ente sometimes adds those)
	url = url.replace(
		/(secret=)([A-Za-z0-9\-+]+)/g,
		(_, prefix, secret) => prefix + secret.replace(/[-+]/g, "")
	);

	return url;
};

const parseSecretURL = (url: string): Secret | null => {
	url = sanitizeURL(url);
	const totp = OTPAuth.URI.parse(url);
	const getExtraInfo = new URL(url).searchParams;
	const codeDisplay = getExtraInfo.get("codeDisplay");
	const parsedCodeDisplay = codeDisplay ? JSON.parse(codeDisplay) : null;

	// Skip trashed entries
	if (parsedCodeDisplay?.trashed) {
		return null;
	}

	return {
		username: totp.label,
		issuer: totp.issuer,
		algorithm: totp.algorithm,
		digits: totp.digits,
		period: getExtraInfo.get("period") ?? "",
		tags: parsedCodeDisplay?.tags?.map((tag: string) => tag.trim()) ?? [],
		notes: parsedCodeDisplay?.note ?? "",
		secret: totp.secret.base32,
	};
};

export const getSecrets = (filePath: string = "ente_auth.txt"): string[] => {
	return fse.readFileSync(filePath, "utf8").split("\n");
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
				console.error("Error parsing line:", line);
			}
		}
	});

	return secretsList;
};

export const storeSecrets = async (secrets: Secret[]) => {
	await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(secrets));
};
