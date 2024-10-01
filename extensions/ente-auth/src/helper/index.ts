import * as fs from "fs";
import * as path from "path";
import * as OTPAuth from "otpauth";
import { dataTransformer } from "./transformer";
import { ServiceData as SecretsJson, JsonFormat } from "./types";

export const DB_FILE = path.join(process.env.HOME || "", ".local", "share", "ente-totp", "db.json");

export const listSecretsWithTOTP = (): JsonFormat[] => {
  const items: JsonFormat[] = [];

  try {
    const data: SecretsJson = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

    Object.entries(data).forEach(([serviceName, serviceData]) => {
      serviceData.forEach(({ username, secret }) => {
        const totp = new OTPAuth.TOTP({ secret });
        const currentTotp = totp.generate();
        const currentTotpTimeRemaining = totp.period - (Math.floor(Date.now() / 1000) % totp.period);
        const nextTotp = totp.generate({ timestamp: Date.now() + 30 * 1000 });

        const formattedData = dataTransformer(serviceName, username, currentTotp, currentTotpTimeRemaining, nextTotp);

        if (formattedData) {
          items.push(formattedData);
        }
      });
    });
  } catch (err: any) {
    if (err.message.includes("No such file or directory")) {
      console.error("Database not found. Please import secrets first.");
      return [];
    }
    console.error("Error reading secrets: ", err);
  }

  return items;
};

export type { SecretsJson };
