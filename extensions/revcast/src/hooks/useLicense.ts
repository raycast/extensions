import { useEffect, useState } from "react";

import {
  activateLicense as activateRemoteLicense,
  createBillingPortal,
  deactivateLicense as deactivateRemoteLicense,
  validateLicense as validateRemoteLicense,
} from "../lib/license-service";
import {
  clearLicenseState,
  getLicenseState,
  saveLicenseState,
} from "../lib/storage";
import { LicenseState } from "../lib/types";

export function useLicense() {
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    setIsLoading(true);
    const nextLicense = await getLicenseState();
    setLicense(nextLicense);
    setIsLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function activateLicense(input: {
    instanceName: string;
    licenseKey: string;
  }) {
    const activation = await activateRemoteLicense(input);
    const nextLicense: LicenseState = {
      customerEmail: activation.customerEmail,
      customerName: activation.customerName,
      instanceId: activation.instanceId,
      instanceName: activation.instanceName,
      licenseKey: input.licenseKey.trim(),
      licenseKeyId: activation.licenseKeyId,
      licenseStatus: activation.licenseStatus,
      plan: activation.plan,
      productId: activation.productId,
      status: "active",
      subscriptionStatus: activation.subscriptionStatus,
      updatedAt: new Date().toISOString(),
    };

    await saveLicenseState(nextLicense);
    setLicense(nextLicense);
    return nextLicense;
  }

  async function refreshLicense() {
    if (!license) {
      return null;
    }

    const validation = await validateRemoteLicense(license);
    const nextLicense: LicenseState = {
      ...license,
      customerEmail: validation.customerEmail ?? license.customerEmail,
      licenseStatus: validation.licenseStatus ?? license.licenseStatus,
      plan: validation.plan ?? license.plan,
      status: validation.valid ? "active" : "invalid",
      subscriptionStatus:
        validation.subscriptionStatus ?? license.subscriptionStatus,
      updatedAt: new Date().toISOString(),
    };

    await saveLicenseState(nextLicense);
    setLicense(nextLicense);
    return nextLicense;
  }

  async function clearLicense() {
    await clearLicenseState();
    setLicense(null);
  }

  async function releaseLicense() {
    if (!license) {
      return;
    }

    await deactivateRemoteLicense(license);
    await clearLicense();
  }

  async function openBillingPortal() {
    if (!license) {
      return null;
    }

    return createBillingPortal(license);
  }

  return {
    activateLicense,
    clearLicense,
    isLoading,
    license,
    openBillingPortal,
    refreshLicense,
    reload,
    releaseLicense,
  };
}
