import { Toast, open, openExtensionPreferences, showInFinder, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { failures, mergeSales, settleAll, successes } from "../core/aggregate";
import { exportFileName, salesToCsv } from "../core/csv";
import { serializeError } from "../core/errors";
import { resolveRange } from "../core/ranges";
import { defaultRangeId, getExtensionPreferences, runtimeHttp, selectedRange } from "../hooks/runtime";
import { buyUrl } from "../license/config";
import { checkLicense } from "../license/useLicense";
import { configuredProviderIds, createProviders } from "../providers/registry";
import { PROVIDER_LABELS } from "../providers/types";

/** Large enough for a month of sales; each adapter's page cap still applies. */
const EXPORT_LIMIT = 10_000;

export default async function ExportCsv() {
  const license = await checkLicense();
  if (!license.isPro) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Revenue Bar Pro Required",
      message: "CSV export is part of Revenue Bar Pro.",
      primaryAction: { title: "Buy Revenue Bar Pro", onAction: () => open(buyUrl()) },
      secondaryAction: { title: "Enter License Key", onAction: () => openExtensionPreferences() },
    });
    return;
  }

  const prefs = getExtensionPreferences();
  const ids = configuredProviderIds(prefs);
  if (ids.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No API Keys",
      message: "Add a provider key in the extension preferences.",
      primaryAction: { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() },
    });
    return;
  }

  // The range last picked in the dashboard, so "export what I'm looking at" works.
  const range = resolveRange(selectedRange(defaultRangeId(prefs)));
  const toast = await showToast({ style: Toast.Style.Animated, title: `Exporting sales · ${range.label}` });

  try {
    const results = await settleAll(createProviders(ids, prefs, runtimeHttp()), (p) =>
      p.sales(range, { limit: EXPORT_LIMIT }),
    );
    const failed = failures(results);
    const sales = mergeSales(successes(results));
    if (sales.length === 0 && failed.length === results.length) {
      throw new Error(failed.map((f) => `${PROVIDER_LABELS[f.provider]}: ${f.error.message}`).join("; "));
    }

    const directory = join(homedir(), "Downloads");
    await mkdir(directory, { recursive: true });
    const path = join(
      directory,
      exportFileName(range.label, new Date(), (name) => existsSync(join(directory, name))),
    );
    await writeFile(path, salesToCsv(sales), "utf8");

    toast.style = Toast.Style.Success;
    toast.title = `Exported ${sales.length} ${sales.length === 1 ? "sale" : "sales"}`;
    toast.message =
      failed.length > 0
        ? `Skipped ${failed.map((f) => `${PROVIDER_LABELS[f.provider]} (${f.error.message})`).join(", ")}`
        : path.replace(homedir(), "~");
    toast.primaryAction = { title: "Open File", onAction: () => open(path) };
    toast.secondaryAction = { title: "Show in Finder", onAction: () => showInFinder(path) };
  } catch (error) {
    await toast.hide();
    await showFailureToast(serializeError(error).message, { title: "Could not export sales" });
  }
}
