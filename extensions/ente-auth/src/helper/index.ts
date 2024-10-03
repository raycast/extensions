import * as OTPAuth from "otpauth";
import { dataTransformer } from "./transformer";
import { Secret, JsonFormat } from "./types";
import { LocalStorage } from "@raycast/api";
import { STORAGE_KEY } from "./secrets";

export const getJsonFormatFromStore = async (): Promise<JsonFormat[]> => {
  const storageStringRaw = await LocalStorage.getItem<string>(STORAGE_KEY);
  const data: Secret[] = JSON.parse(storageStringRaw ?? "{}");

  return mapSecretsToJsonFormat(data);
};

export const mapSecretsToJsonFormat = (items: Secret[]): JsonFormat[] => {
  const result: JsonFormat[] = [];

  try {
    items.forEach((item) => {
      const totp = new OTPAuth.TOTP({ secret: item.secret });
      const currentTotp = totp.generate();
      const currentTotpTimeRemaining = totp.period - (Math.floor(Date.now() / 1000) % totp.period);
      const nextTotp = totp.generate({ timestamp: Date.now() + 30 * 1000 });

      const formattedData = dataTransformer(
        item.username,
        item.issuer,
        item.algorithm,
        item.digits,
        item.period,
        item.tags,
        item.notes,
        currentTotp,
        currentTotpTimeRemaining,
        nextTotp,
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
