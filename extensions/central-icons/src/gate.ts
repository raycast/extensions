import {
  confirmAlert,
  getPreferenceValues,
  Icon,
  LocalStorage,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import { checkLicense, FREE_COPY_LIMIT } from "./license";

const COPY_COUNT_KEY = "copy-count";

export type LicenseState = "unknown" | "none" | "valid" | "invalid";

export interface ExportGate {
  licenseState: LicenseState;
  remainingCopies: number;
  runExport: (perform: () => Promise<unknown> | void) => Promise<void>;
}

export function useExportGate(): ExportGate {
  const preferences = getPreferenceValues<{ licenseKey?: string }>();
  const licenseKey = preferences.licenseKey?.trim() ?? "";
  const [licenseState, setLicenseState] = useState<LicenseState>("unknown");
  const { value: copyCount = 0, setValue: setCopyCount } = useLocalStorage<number>(COPY_COUNT_KEY, 0);
  const remainingCopies = Math.max(0, FREE_COPY_LIMIT - copyCount);

  useEffect(() => {
    let cancelled = false;
    if (!licenseKey) {
      setLicenseState("none");
      return;
    }
    checkLicense(licenseKey).then((valid) => {
      if (cancelled) return;
      setLicenseState(valid ? "valid" : "invalid");
      if (!valid)
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid License Key",
          message: "Check the key in the extension preferences.",
        });
    });
    return () => {
      cancelled = true;
    };
  }, [licenseKey]);

  async function promptForLicense() {
    await confirmAlert({
      title: "Free Copy Limit Reached",
      message:
        `You have used your ${FREE_COPY_LIMIT} free copies. Enter your license key in the extension ` +
        `preferences for unlimited copies, then reopen this command — Raycast passes preferences to a ` +
        `command when it launches, so a new key only takes effect the next time you open it.`,
      icon: Icon.Key,
      primaryAction: {
        title: "Open Preferences",
        onAction: openCommandPreferences,
      },
    });
  }

  async function runExport(perform: () => Promise<unknown> | void) {
    if (licenseState === "valid") {
      await perform();
      return;
    }
    // Read and write the count straight from LocalStorage rather than trusting
    // the hook's copy. The hook reads asynchronously, so `copyCount` is still 0
    // on the first renders, and it does not see writes made by another window;
    // acting on it let the quota reset or lose increments. Awaiting the write
    // before `perform()` also matters because actions like Paste close the
    // window, tearing the command down before a fire-and-forget write lands.
    const used = Number(await LocalStorage.getItem<number>(COPY_COUNT_KEY)) || 0;
    if (used >= FREE_COPY_LIMIT) {
      await promptForLicense();
      return;
    }
    await setCopyCount(used + 1);
    await perform();
  }

  return { licenseState, remainingCopies, runExport };
}
