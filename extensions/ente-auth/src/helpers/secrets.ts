import { LocalStorage } from "@raycast/api";
import fse from "fs-extra";
import * as OTPAuth from "otpauth";
import { STORAGE_KEY } from "../constants/secrets";
import { Secret } from "./types";

const parseSecretURL = (url: string): Secret => {
  const totp = OTPAuth.URI.parse(url);
  const getExtraInfo = new URL(url).searchParams;
  const codeDisplay = getExtraInfo.get("codeDisplay");

  return {
    username: totp.label,
    issuer: totp.issuer,
    algorithm: totp.algorithm,
    digits: totp.digits,
    period: getExtraInfo.get("period") ?? "",
    tags: codeDisplay ? JSON.parse(codeDisplay).tags.map((tag: string) => tag.trim()) : [],
    notes: codeDisplay ? JSON.parse(codeDisplay).note : "",
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
        secretsList.push(parseSecretURL(line));
      } catch (error) {
        console.error("Error parsing line:", line);
      }
    }
  });

  return secretsList;
};

export const storeSecrets = async (secrets: Secret[]) => {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(secrets));
};
