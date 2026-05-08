import { LocalStorage } from "@raycast/api";
import type { DoctorWarning } from "./brew-maintenance";

const STORAGE_KEY = "doctor-warnings";

export async function storeDoctorWarnings(warnings: DoctorWarning[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(warnings));
}

export async function getStoredDoctorWarnings(): Promise<DoctorWarning[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DoctorWarning[];
  } catch {
    return [];
  }
}
