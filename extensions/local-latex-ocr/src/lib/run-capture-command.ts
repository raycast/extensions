import {
  closeMainWindow,
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  open,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { captureRegion, ScreenCapturePermissionError } from "./capture";
import { copyLatex, deliverLatex } from "./deliver";
import { ensureModel, MODEL_TOTAL_BYTES } from "./model";
import { cleanStaleCaptures, saveReview } from "./review-store";
import { recognizeWithWorker, warmWorker } from "./worker-client";
import type { OutputMode, ReviewRecord } from "../types";

export async function runCaptureCommand(outputMode: OutputMode, commandName: string): Promise<void> {
  const startedAt = performance.now();
  if (process.arch !== "arm64") {
    await showHUD("Local LaTeX OCR currently supports Apple Silicon Macs only");
    return;
  }

  const preferences = getPreferenceValues<Preferences>();
  void cleanStaleCaptures(environment.supportPath);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Preparing Local LaTeX OCR…",
  });
  let imagePath: string | undefined;

  try {
    const modelDirectory = await ensureModel(environment.supportPath, (progress) => {
      toast.title = `Downloading ${progress.file}`;
      toast.message = `${Math.round(progress.overallFraction * 100)}% of ${Math.round(MODEL_TOTAL_BYTES / 2 ** 20)} MiB`;
    });

    // Session creation is overlapped with the user's rectangle selection so
    // the first capture feels like a warm capture as well.
    void warmWorker({
      supportPath: environment.supportPath,
      assetsPath: environment.assetsPath,
      modelDirectory,
    }).catch(() => undefined);

    toast.title = "Select an equation";
    toast.message = "Press Escape to cancel";
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    imagePath = await captureRegion(environment.supportPath);
    if (!imagePath) {
      await toast.hide();
      return;
    }

    toast.title = "Recognizing equation…";
    toast.message = "Processing locally";
    const result = await recognizeWithWorker({
      supportPath: environment.supportPath,
      assetsPath: environment.assetsPath,
      imagePath,
      modelDirectory,
    });
    const mustReview =
      preferences.alwaysShowPreview ||
      result.reviewReasons.length > 0 ||
      (!preferences.copyToClipboard && !preferences.pasteAutomatically);

    // Keep the result recoverable even when a low-confidence result is sent to
    // review. This makes the default copy behavior consistent for every capture.
    if (mustReview && preferences.copyToClipboard) {
      await copyLatex(result.latex, outputMode);
    }

    if (mustReview) {
      const record: ReviewRecord = {
        version: 1,
        requestId: randomUUID(),
        createdAt: Date.now(),
        imagePath,
        outputMode,
        commandName,
        result,
      };
      await saveReview(environment.supportPath, record);
      await toast.hide();
      await launchCommand({
        name: "review-last-capture",
        type: LaunchType.UserInitiated,
        context: { requestId: record.requestId },
      });
      return;
    }

    await deliverLatex(result.latex, outputMode, preferences);
    await rm(imagePath, { force: true });
    imagePath = undefined;
    await toast.hide();
    await showHUD(
      `LaTeX ready · ${Math.round(performance.now() - startedAt)} ms total · ${Math.round(result.elapsedMs)} ms OCR · ${backendLabel(result.backend)}`,
    );
  } catch (error) {
    if (imagePath) await rm(imagePath, { force: true });
    const message = error instanceof Error ? error.message : String(error);
    toast.style = Toast.Style.Failure;
    toast.title =
      error instanceof ScreenCapturePermissionError ? "Screen capture unavailable" : "Could not recognize equation";
    toast.message = message;
    if (error instanceof ScreenCapturePermissionError || /screen|capture|blank|visible equation/i.test(message)) {
      toast.primaryAction = {
        title: "Open Screen Recording Settings",
        onAction: () => void open("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"),
      };
    }
  }
}

function backendLabel(backend: "coreml" | "cpu" | "wasm"): string {
  if (backend === "cpu") return "Apple Silicon Native";
  if (backend === "coreml") return "Core ML";
  return "WASM";
}
