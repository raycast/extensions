import { readFileSync } from "fs";
import { LocalStorage } from "@raycast/api";
import { ProtonExport, TOTPAccount } from "../types";
import { parseOtpAuthUri } from "./parser";

export async function loadAccountsFromStorage(): Promise<TOTPAccount[]> {
  try {
    const storedData = await LocalStorage.getItem<string>("RAYCAST_PROTON_AUTH_DATA");
    if (!storedData) {
      return [];
    }

    const exportData: ProtonExport = JSON.parse(storedData);
    return parseProtonExport(exportData);
  } catch (error) {
    console.error("Failed to read from storage:", error);
    throw error;
  }
}

export async function saveAccountsToStorage(filePath: string): Promise<TOTPAccount[]> {
  try {
    const fileContent = readFileSync(filePath, "utf8");
    const exportData: ProtonExport = JSON.parse(fileContent);

    if (!validateProtonExport(exportData)) {
      throw new Error("Invalid Proton Authenticator export format");
    }

    await LocalStorage.setItem("RAYCAST_PROTON_AUTH_DATA", fileContent);

    return parseProtonExport(exportData);
  } catch (error) {
    console.error("Failed to save to storage:", error);
    throw error;
  }
}

function validateProtonExport(data: ProtonExport) {
  return (
    data &&
    Array.isArray(data.entries) &&
    data.entries.length > 0 &&
    data.entries.every(
      (entry) =>
        entry.id && entry.content && entry.content.entry_type === "Totp" && entry.content.uri && entry.content.name,
    )
  );
}

function parseProtonExport(exportData: ProtonExport): TOTPAccount[] {
  const accounts: TOTPAccount[] = [];

  for (const entry of exportData.entries) {
    if (entry.content.entry_type === "Totp") {
      const parsed = parseOtpAuthUri(entry.content.uri);
      if (parsed) {
        accounts.push({
          id: entry.id,
          ...parsed,
        });
      }
    }
  }

  return accounts;
}

export async function clearStoredData(): Promise<void> {
  await LocalStorage.removeItem("RAYCAST_PROTON_AUTH_DATA");
}
