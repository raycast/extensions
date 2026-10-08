/**
 * License state machine, free of Raycast APIs so every branch is unit-tested.
 *
 * - Validation results are cached for 7 days (no network call inside that window).
 * - When a revalidation cannot reach Lemon Squeezy, Pro keeps working for 14 days after the last successful
 *   validation (offline grace). A definitive "invalid" answer ends Pro immediately.
 * - Only a SHA-256 fingerprint of the key is stored, never the key.
 * - With licensing unconfigured (TODO(felipe) constants unset) everyone is on the free tier.
 */
import { createHash } from "node:crypto";
import { serializeError } from "../core/errors";
import { TTL } from "../core/cache";
import { LicenseConfig, isLicensingConfigured } from "./config";
import {
  ActivateResponse,
  LicenseApi,
  LicenseMeta,
  ValidateResponse,
  isDefinitiveRejection,
} from "./lemonsqueezy-license";

export type StoredLicense = {
  fingerprint: string;
  instanceId?: string;
  instanceName?: string;
  valid: boolean;
  /** Last time Lemon Squeezy confirmed the key as valid. */
  lastValidatedAt?: number;
  /** Last time Lemon Squeezy gave a definitive answer (valid or not). */
  checkedAt?: number;
  /** Set after "Deactivate on This Mac" so the key in preferences is not silently re-activated. */
  deactivated?: boolean;
  error?: string;
  licenseStatus?: string;
  customerName?: string;
  customerEmail?: string;
  activationUsage?: number;
  activationLimit?: number;
  expiresAt?: string;
};

export type LicenseStatus =
  | { kind: "unconfigured" }
  | { kind: "none" }
  | { kind: "pro"; source: "cache" | "server" | "grace"; license: StoredLicense }
  | { kind: "invalid"; message: string; license?: StoredLicense }
  | { kind: "offline"; message: string; license?: StoredLicense }
  | { kind: "deactivated"; license: StoredLicense };

export type Evaluation = {
  status: LicenseStatus;
  /** What to persist. `null` clears storage, `undefined` leaves it unchanged. */
  stored: StoredLicense | null | undefined;
};

export type EvaluateInput = {
  key: string | undefined;
  config: LicenseConfig;
  stored: StoredLicense | undefined;
  now: number;
  api: LicenseApi;
  instanceName: string;
  /** Skip the 7-day cache (the "Validate License" action). */
  force?: boolean;
  /** Re-activate a key that was deactivated on this machine. */
  activate?: boolean;
};

/** A definitive "invalid" is not re-checked for this long, unless forced or the key changes. */
export const INVALID_RECHECK_MS = 60 * 60 * 1000;

export function fingerprint(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}

export function isPro(status: LicenseStatus): boolean {
  return status.kind === "pro";
}

export function matchesProduct(meta: LicenseMeta | null | undefined, config: LicenseConfig): boolean {
  return Boolean(meta && meta.store_id === config.storeId && meta.product_id === config.productId);
}

function details(response: ValidateResponse | ActivateResponse): Partial<StoredLicense> {
  return {
    licenseStatus: response.license_key?.status,
    customerName: response.meta?.customer_name ?? undefined,
    customerEmail: response.meta?.customer_email ?? undefined,
    activationUsage: response.license_key?.activation_usage ?? undefined,
    activationLimit: response.license_key?.activation_limit ?? undefined,
    expiresAt: response.license_key?.expires_at ?? undefined,
  };
}

const WRONG_PRODUCT = "This license key is for a different product.";

async function activate(input: EvaluateInput, fp: string): Promise<Evaluation> {
  const key = (input.key as string).trim();
  let response: ActivateResponse;
  try {
    response = await input.api.activate(key, input.instanceName);
  } catch (error) {
    const message = serializeError(error).message;
    if (isDefinitiveRejection(error)) {
      const stored: StoredLicense = { fingerprint: fp, valid: false, error: message, checkedAt: input.now };
      return { status: { kind: "invalid", message, license: stored }, stored };
    }
    return { status: { kind: "offline", message }, stored: undefined };
  }

  if (!response.activated || !response.instance) {
    const message = response.error ?? "This license key could not be activated.";
    const stored: StoredLicense = {
      fingerprint: fp,
      valid: false,
      error: message,
      checkedAt: input.now,
      ...details(response),
    };
    return { status: { kind: "invalid", message, license: stored }, stored };
  }

  if (!matchesProduct(response.meta, input.config)) {
    // Give the slot back; the key belongs to someone else's product.
    await input.api.deactivate(key, response.instance.id).catch(() => undefined);
    const stored: StoredLicense = { fingerprint: fp, valid: false, error: WRONG_PRODUCT, checkedAt: input.now };
    return { status: { kind: "invalid", message: WRONG_PRODUCT, license: stored }, stored };
  }

  const stored: StoredLicense = {
    fingerprint: fp,
    instanceId: response.instance.id,
    instanceName: response.instance.name ?? input.instanceName,
    valid: true,
    lastValidatedAt: input.now,
    checkedAt: input.now,
    ...details(response),
  };
  return { status: { kind: "pro", source: "server", license: stored }, stored };
}

export async function evaluateLicense(input: EvaluateInput): Promise<Evaluation> {
  if (!isLicensingConfigured(input.config)) {
    return { status: { kind: "unconfigured" }, stored: undefined };
  }
  const key = input.key?.trim();
  if (!key) {
    return { status: { kind: "none" }, stored: input.stored ? null : undefined };
  }

  const fp = fingerprint(key);
  // A different key than last time starts from scratch.
  const stored = input.stored?.fingerprint === fp ? input.stored : undefined;

  if (stored?.deactivated && !input.activate) {
    return { status: { kind: "deactivated", license: stored }, stored: undefined };
  }

  const recentlyRejected =
    stored !== undefined &&
    !stored.valid &&
    !stored.deactivated &&
    stored.error !== undefined &&
    stored.checkedAt !== undefined &&
    input.now - stored.checkedAt < INVALID_RECHECK_MS;
  if (recentlyRejected && !input.force) {
    return { status: { kind: "invalid", message: stored.error as string, license: stored }, stored: undefined };
  }

  if (!stored?.instanceId || stored.deactivated) {
    return activate(input, fp);
  }

  const fresh =
    stored.valid && stored.lastValidatedAt !== undefined && input.now - stored.lastValidatedAt < TTL.licenseRevalidate;
  if (fresh && !input.force) {
    return { status: { kind: "pro", source: "cache", license: stored }, stored: undefined };
  }

  let response: ValidateResponse;
  try {
    response = await input.api.validate(key, stored.instanceId);
  } catch (error) {
    const message = serializeError(error).message;
    if (isDefinitiveRejection(error)) {
      const next: StoredLicense = { ...stored, valid: false, error: message, checkedAt: input.now };
      return { status: { kind: "invalid", message, license: next }, stored: next };
    }
    const withinGrace =
      stored.valid &&
      stored.lastValidatedAt !== undefined &&
      input.now - stored.lastValidatedAt < TTL.licenseOfflineGrace;
    if (withinGrace) {
      return { status: { kind: "pro", source: "grace", license: stored }, stored: undefined };
    }
    return { status: { kind: "offline", message, license: stored }, stored: undefined };
  }

  if (!response.valid) {
    // The instance was removed (for example from the Lemon Squeezy dashboard) but the key is still good:
    // activate this machine again instead of locking the user out.
    if (response.license_key?.status === "active" && !response.instance) {
      return activate(input, fp);
    }
    const message = response.error ?? "This license key is not valid.";
    const next: StoredLicense = { ...stored, valid: false, error: message, checkedAt: input.now, ...details(response) };
    return { status: { kind: "invalid", message, license: next }, stored: next };
  }

  if (!matchesProduct(response.meta, input.config)) {
    const next: StoredLicense = { ...stored, valid: false, error: WRONG_PRODUCT, checkedAt: input.now };
    return { status: { kind: "invalid", message: WRONG_PRODUCT, license: next }, stored: next };
  }

  const next: StoredLicense = {
    ...stored,
    valid: true,
    lastValidatedAt: input.now,
    checkedAt: input.now,
    error: undefined,
    ...details(response),
  };
  return { status: { kind: "pro", source: "server", license: next }, stored: next };
}

/** Frees this machine's activation slot. Returns the state to persist. */
export async function deactivateLicense(input: {
  key: string;
  stored: StoredLicense;
  api: LicenseApi;
}): Promise<StoredLicense> {
  if (!input.stored.instanceId) {
    return { ...input.stored, deactivated: true, valid: false };
  }
  const response = await input.api.deactivate(input.key.trim(), input.stored.instanceId);
  if (!response.deactivated) {
    throw new Error(response.error ?? "Lemon Squeezy did not deactivate this license.");
  }
  return {
    fingerprint: input.stored.fingerprint,
    deactivated: true,
    valid: false,
    ...details({ ...response, valid: false }),
  };
}

export function statusLabel(status: LicenseStatus): string {
  switch (status.kind) {
    case "unconfigured":
      return "Free";
    case "none":
      return "Free";
    case "pro":
      return status.source === "grace" ? "Pro (offline)" : "Pro";
    case "invalid":
      return "Invalid License Key";
    case "offline":
      return "Could Not Validate";
    case "deactivated":
      return "Deactivated on This Mac";
  }
}
