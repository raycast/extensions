import { getApplications, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { EGO_LITE_BUNDLE_ID, EGO_LITE_WEBSITE } from "../constants";
import { normalizeWebUrl } from "./browser-safety";

export class EgoLiteNotInstalledError extends Error {
  constructor() {
    super("Ego Lite is not installed.");
    this.name = "EgoLiteNotInstalledError";
  }
}

export async function ensureEgoLiteInstalled(): Promise<void> {
  const applications = await getApplications();
  if (!applications.some((application) => application.bundleId === EGO_LITE_BUNDLE_ID)) {
    throw new EgoLiteNotInstalledError();
  }
}

export async function showEgoLiteFailure(error: unknown, title: string): Promise<void> {
  await showFailureToast(error, {
    title,
    ...(error instanceof EgoLiteNotInstalledError
      ? {
          primaryAction: {
            title: "Open Ego Lite Website",
            onAction: () => void open(EGO_LITE_WEBSITE),
          },
        }
      : {}),
  });
}

export async function createBlankTab(): Promise<void> {
  await ensureEgoLiteInstalled();
  await open("ego://newtab", EGO_LITE_BUNDLE_ID);
}

export async function openUrlInNewTab(value: string): Promise<void> {
  await ensureEgoLiteInstalled();
  await open(normalizeWebUrl(value), EGO_LITE_BUNDLE_ID);
}
