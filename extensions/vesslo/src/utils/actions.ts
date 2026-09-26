import { open, showToast, Toast, showInFinder } from "@raycast/api";
import { VessloApp } from "../types";
import type { VessloData } from "../types";
import { randomUUID } from "crypto";
import { createHomebrewReviewExecutor } from "./handoff-execution";
import { readCurrentVessloData } from "./data-reader";
import { AppIntent, createAppActionExecutor } from "./action-execution";

const execute = createAppActionExecutor({
  read: () => readCurrentVessloData({ force: true }),
  open,
  reveal: showInFinder,
});

const reviewHomebrew = createHomebrewReviewExecutor({
  read: () => readCurrentVessloData({ force: true }),
  open,
  now: Date.now,
  uuid: randomUUID,
});

export async function requestHomebrewReview(
  data: VessloData,
  apps: readonly VessloApp[],
) {
  return reviewHomebrew(data, apps);
}

export async function openInVesslo(bundleId?: string | null) {
  try {
    await open(
      bundleId ? `vesslo://app/${encodeURIComponent(bundleId)}` : "vesslo://",
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Vesslo",
      message: String(error).slice(0, 160),
    });
  }
}

export async function performAppAction(app: VessloApp, intent: AppIntent) {
  try {
    const result = await execute(app, intent);
    if (result.kind === "blocked") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Review Required",
        message: result.reason,
      });
    } else if (result.kind === "handedOff") {
      await showToast({
        style: Toast.Style.Success,
        title: "Request Sent to Vesslo",
        message: "Check progress and verification in Vesslo.",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Complete Action",
      message: String(error).slice(0, 160),
    });
  }
}
