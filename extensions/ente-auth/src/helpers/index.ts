import { LocalStorage } from "@raycast/api";
import { STORAGE_KEY } from "../constants/secrets";
import { dataTransformer } from "../constants/transformer";
import { generateTotpCodes } from "./totp";
import { JsonFormat, Secret } from "./types";

export const getJsonFormatFromStore = async (): Promise<JsonFormat[]> => {
	const storageStringRaw = await LocalStorage.getItem<string>(STORAGE_KEY);
	const data: Secret[] = JSON.parse(storageStringRaw || "[]");

	return mapSecretsToJsonFormat(data);
};

export const mapSecretsToJsonFormat = (items: Secret[]): JsonFormat[] => {
	const result: JsonFormat[] = [];

	if (!items) {
		return [];
	}

	try {
		items.forEach((item) => {
			const { currentTotp, currentTotpTimeRemaining, nextTotp, period } = generateTotpCodes(item);

			const formattedData = dataTransformer(
				item.username,
				item.issuer,
				item.algorithm,
				item.digits,
				String(period),
				item.tags,
				item.notes,
				currentTotp,
				currentTotpTimeRemaining,
				nextTotp
			);

			if (formattedData) {
				result.push(formattedData);
			}
		});
	} catch (err: unknown) {
		if (err instanceof Error && err.message.includes("No such file or directory")) {
			console.error("Database not found. Please import secrets first.");
			return [];
		}
		console.error("Error reading secrets: ", err);
	}

	return result;
};
