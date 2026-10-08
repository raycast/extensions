import { LocalStorage, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { hostname } from "node:os";
import { useMemo } from "react";
import { CACHE_KEYS } from "../core/cache";
import { redact } from "../core/errors";
import { createHttp } from "../core/http";
import { getExtensionPreferences } from "../hooks/runtime";
import { LICENSE_CONFIG } from "./config";
import { createLicenseApi } from "./lemonsqueezy-license";
import { LicenseStatus, StoredLicense, deactivateLicense, evaluateLicense, fingerprint, isPro } from "./license-state";

function isStoredLicense(value: unknown): value is StoredLicense {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as StoredLicense).fingerprint === "string" &&
    typeof (value as StoredLicense).valid === "boolean"
  );
}

async function readStored(): Promise<StoredLicense | undefined> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEYS.license);
  if (typeof raw !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredLicense(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function writeStored(value: StoredLicense | null | undefined): Promise<void> {
  if (value === null) await LocalStorage.removeItem(CACHE_KEYS.license);
  else if (value !== undefined) await LocalStorage.setItem(CACHE_KEYS.license, JSON.stringify(value));
}

function licenseApi() {
  return createLicenseApi(createHttp(), createHttp({ retries: 0 }));
}

/** Shown in the buyer's Lemon Squeezy order, so they can tell their machines apart. */
export function instanceName(): string {
  return `Revenue Bar · ${hostname()}`;
}

/** Evaluates and persists the license. Never throws: failures become an `offline` or `invalid` status. */
export async function resolveLicense(options: { force?: boolean; activate?: boolean } = {}): Promise<LicenseStatus> {
  const prefs = getExtensionPreferences();
  const result = await evaluateLicense({
    key: prefs.licenseKey,
    config: LICENSE_CONFIG,
    stored: await readStored(),
    now: Date.now(),
    api: licenseApi(),
    instanceName: instanceName(),
    ...options,
  });
  await writeStored(result.stored);
  return result.status;
}

/** Non-hook check for no-view commands. */
export async function checkLicense(): Promise<{ isPro: boolean; status: LicenseStatus }> {
  const status = await resolveLicense();
  return { isPro: isPro(status), status };
}

export async function deactivateThisMac(): Promise<void> {
  const key = getExtensionPreferences().licenseKey?.trim();
  const stored = await readStored();
  if (!key || !stored) throw new Error("No license is active on this Mac.");
  await writeStored(await deactivateLicense({ key, stored, api: licenseApi() }));
}

/** Several components call useLicense in one command; the invalid-key toast is shown once per command run. */
let notifiedInvalid: string | undefined;

export type UseLicense = {
  status?: LicenseStatus;
  isPro: boolean;
  isLoading: boolean;
  /** Validate now, skipping the 7-day cache. */
  validate: () => Promise<void>;
  /** Activate a key that was deactivated on this Mac. */
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
};

/**
 * Central license hook. Every Pro check goes through `isPro` here (and `ProGate` / `LockedProviderSection` in
 * gate.tsx), so the free/Pro boundary can move without touching features.
 *
 * `notify` shows the invalid-key Failure toast (central-icons / shell-buddy). Menu-bar commands pass `false`:
 * toasts are not available there.
 */
export function useLicense(options: { notify?: boolean } = {}): UseLicense {
  const notify = options.notify ?? true;
  const key = useMemo(() => getExtensionPreferences().licenseKey?.trim() ?? "", []);
  // Cache on the key's fingerprint, never the key.
  const keyId = useMemo(() => (key ? fingerprint(key) : ""), [key]);

  const { data, isLoading, mutate } = useCachedPromise((_keyId: string) => resolveLicense(), [keyId], {
    keepPreviousData: false,
    onError: (error) => {
      console.error(`Revenue Bar license check failed: ${redact(error.message)}`);
    },
    onData: (status) => {
      if (notify && status.kind === "invalid" && notifiedInvalid !== `${keyId}:${status.message}`) {
        notifiedInvalid = `${keyId}:${status.message}`;
        void showToast({
          style: Toast.Style.Failure,
          title: "Invalid License Key",
          message: status.message,
          primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
        });
      }
    },
  });

  return {
    status: data,
    isPro: data ? isPro(data) : false,
    isLoading,
    validate: async () => {
      await mutate(resolveLicense({ force: true }), { shouldRevalidateAfter: false });
    },
    activate: async () => {
      await mutate(resolveLicense({ activate: true, force: true }), { shouldRevalidateAfter: false });
    },
    deactivate: async () => {
      await mutate(
        deactivateThisMac().then(() => resolveLicense()),
        { shouldRevalidateAfter: false },
      );
    },
  };
}
