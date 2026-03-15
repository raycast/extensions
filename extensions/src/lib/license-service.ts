import { getPreferenceValues } from "@raycast/api";

import { LicenseState } from "./types";

type Preferences = {
  revcastApiBaseUrl?: string;
};

type ActivateLicensePayload = {
  customerEmail: string;
  customerName: string;
  instanceId: string;
  instanceName: string;
  licenseKeyId: string;
  licenseStatus: string;
  plan: LicenseState["plan"];
  productId: string;
  subscriptionStatus: string | null;
};

type ValidateLicensePayload = {
  customerEmail: string | null;
  licenseStatus: string | null;
  plan: LicenseState["plan"] | null;
  subscriptionStatus: string | null;
  valid: boolean;
};

const MISSING_CLOUD_URL_MESSAGE =
  "Set the Revcast Cloud URL in the extension preferences before using License & Billing.";

function getConfiguredApiBaseUrl() {
  const preferences = getPreferenceValues<Preferences>();
  const baseUrl = preferences.revcastApiBaseUrl?.trim();
  return baseUrl ? baseUrl.replace(/\/$/, "") : null;
}

function getApiBaseUrl() {
  const baseUrl = getConfiguredApiBaseUrl();

  if (!baseUrl) {
    throw new Error(MISSING_CLOUD_URL_MESSAGE);
  }

  return baseUrl;
}

async function postJson<T>(path: string, body: unknown) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Something went wrong.");
  }

  return payload;
}

export function getPricingUrl() {
  const baseUrl = getConfiguredApiBaseUrl();
  return baseUrl ? `${baseUrl}/#pricing` : null;
}

export function getLicenseConfigurationError() {
  return MISSING_CLOUD_URL_MESSAGE;
}

export function isLicenseBackendConfigured() {
  return Boolean(getConfiguredApiBaseUrl());
}

export async function activateLicense(input: {
  instanceName: string;
  licenseKey: string;
}) {
  return postJson<ActivateLicensePayload>("/api/license/activate", input);
}

export async function validateLicense(licenseState: LicenseState) {
  return postJson<ValidateLicensePayload>("/api/license/validate", {
    instanceId: licenseState.instanceId,
    licenseKey: licenseState.licenseKey,
    licenseKeyId: licenseState.licenseKeyId,
  });
}

export async function deactivateLicense(licenseState: LicenseState) {
  await postJson<{ ok: true }>("/api/license/deactivate", {
    instanceId: licenseState.instanceId,
    licenseKey: licenseState.licenseKey,
  });
}

export async function createBillingPortal(licenseState: LicenseState) {
  return postJson<{ url: string }>("/api/license/portal", {
    licenseKeyId: licenseState.licenseKeyId,
  });
}
