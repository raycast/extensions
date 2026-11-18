import { isProUser } from "./auth";

export async function isPro(): Promise<boolean> {
  return await isProUser();
}

export async function canUseAdvancedExport(): Promise<boolean> {
  return await isPro();
}

export async function canUseAutoSync(): Promise<boolean> {
  return await isPro();
}

export async function canUseAdvancedFilters(): Promise<boolean> {
  return await isPro();
}
