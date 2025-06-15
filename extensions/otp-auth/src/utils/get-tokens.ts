import * as fs from "fs/promises";
import { Decryptor } from "decrypt-otpauth-ts/dist/decryptor";
import { getPreferenceValues } from "@raycast/api";

export enum ErrorType {
  OTP_AUTH_NOT_INSTALLED = "OTP Auth app not installed",
}

async function checkOTPAuthInstalled() {
  try {
    const globalStats = await fs.stat("/Applications/OTP Auth.app");
    if (globalStats.isDirectory()) return true;
  } catch {
    // Ignore error and try user Applications folder
  }

  try {
    const userStats = await fs.stat(`${process.env.HOME}/Applications/OTP Auth.app`);
    if (userStats.isDirectory()) return true;
  } catch {
    // App not found in user Applications
  }

  return false;
}

export async function getTokens() {
  const isAppInstalled = await checkOTPAuthInstalled();
  if (!isAppInstalled) {
    throw new Error(ErrorType.OTP_AUTH_NOT_INSTALLED);
  }

  const { dbPath, dbPassword } = getPreferenceValues<Preferences>();
  const dbBuffer = await fs.readFile(dbPath);
  const tokens = await Decryptor.decryptBackup(dbBuffer, dbPassword);
  return tokens;
}
