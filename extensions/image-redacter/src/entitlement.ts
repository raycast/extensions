import { LocalStorage } from "@raycast/api";
import { parseLicenseKey, type License } from "./license";
import { FREE_DAILY_REDACTIONS, FREE_PDF_PAGE_LIMIT } from "./plan";
import {
  claimRedaction,
  localDay,
  remainingRedactions,
  type UsageRecord,
} from "./usage";

const LICENSE_KEY_STORAGE = "license-key";
const USAGE_STORAGE = "usage";

export type Entitlement =
  | { plan: "pro" }
  | {
      plan: "free";
      canExport: boolean;
      lockReason?: string;
      remainingToday: number;
      dailyLimit: number;
    };

export type PlanSummary = {
  license?: License;
  licenseKey?: string;
  remainingToday: number;
};

export async function getPlanSummary(): Promise<PlanSummary> {
  const licenseKey = await LocalStorage.getItem<string>(LICENSE_KEY_STORAGE);
  const license = licenseKey ? parseLicenseKey(licenseKey) : undefined;
  return {
    license,
    licenseKey: license ? licenseKey : undefined,
    remainingToday: remainingRedactions(
      await readUsage(),
      localDay(),
      FREE_DAILY_REDACTIONS,
    ),
  };
}

export async function saveLicenseKey(key: string): Promise<License> {
  const license = parseLicenseKey(key);
  if (!license) throw new Error("That license key is not valid.");
  await LocalStorage.setItem(LICENSE_KEY_STORAGE, key.trim());
  return license;
}

export async function removeLicense(): Promise<void> {
  await LocalStorage.removeItem(LICENSE_KEY_STORAGE);
}

export async function resetUsage(): Promise<void> {
  await LocalStorage.removeItem(USAGE_STORAGE);
}

/**
 * Decides whether a newly opened file may be exported, spending a free
 * redaction when it can. Files the free plan can never export, such as long
 * PDFs, are rejected before a redaction is spent.
 */
export async function claimEntitlement(
  fileId: string,
  pdfPageCount?: number,
): Promise<Entitlement> {
  const { license } = await getPlanSummary();
  if (license) return { plan: "pro" };

  const day = localDay();
  const usage = await readUsage();
  const locked = (lockReason: string): Entitlement => ({
    plan: "free",
    canExport: false,
    lockReason,
    remainingToday: remainingRedactions(usage, day, FREE_DAILY_REDACTIONS),
    dailyLimit: FREE_DAILY_REDACTIONS,
  });

  if (pdfPageCount !== undefined && pdfPageCount > FREE_PDF_PAGE_LIMIT) {
    return locked(
      `The free plan exports PDFs of up to ${FREE_PDF_PAGE_LIMIT} pages. This one has ${pdfPageCount}.`,
    );
  }

  const claim = claimRedaction(usage, fileId, day, FREE_DAILY_REDACTIONS);
  if (!claim.allowed) {
    return locked(
      `You have used today's ${FREE_DAILY_REDACTIONS} free redactions. They reset at midnight.`,
    );
  }

  await LocalStorage.setItem(USAGE_STORAGE, JSON.stringify(claim.record));
  return {
    plan: "free",
    canExport: true,
    remainingToday: claim.remaining,
    dailyLimit: FREE_DAILY_REDACTIONS,
  };
}

async function readUsage(): Promise<UsageRecord | undefined> {
  const stored = await LocalStorage.getItem<string>(USAGE_STORAGE);
  if (!stored) return undefined;
  try {
    const record = JSON.parse(stored) as UsageRecord;
    return typeof record.day === "string" && Array.isArray(record.files)
      ? record
      : undefined;
  } catch {
    return undefined;
  }
}
