import type { Toast } from "@raycast/api";
import { runGatekeeperHelper, GatekeeperHelperResult, HelperCommand } from "./automation";
import { openPrivacySecuritySettings } from "./navigation";
import { detectRecentBlockedApp, DetectedAppInfo } from "./detector";

// Safe dynamic loader for Raycast UI API
function getRaycastApi() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@raycast/api");
  } catch {
    return {
      showHUD: async () => {},
      showToast: async () => {},
      Toast: {
        Style: {
          Failure: "FAILURE",
          Success: "SUCCESS",
          Animated: "ANIMATED",
        },
      },
    };
  }
}

export interface OpenAnywayDependencies {
  detectApp?: (options?: { timeoutMs?: number }) => Promise<DetectedAppInfo | null>;
  runHelper?: (mode: HelperCommand, targetApp?: string) => Promise<GatekeeperHelperResult>;
  openSettings?: () => Promise<unknown>;
  notifyHUD?: (message: string) => Promise<void>;
  notifyToast?: (options: { style: Toast.Style; title: string; message?: string }) => Promise<void>;
}

export type FlowOutcome =
  | "no_blocked_app"
  | "target_mismatch"
  | "target_unresolved"
  | "not_found"
  | "activation_failed"
  | "confirmation_pending"
  | "success"
  | "permission_denied"
  | "error";

/**
 * Core flow logic for Open Anyway.
 * Executes detection, validates target application, invokes native helper,
 * and guarantees a clear, actionable manual fallback for every failure state.
 */
export async function handleOpenAnywayFlow(deps: OpenAnywayDependencies = {}): Promise<FlowOutcome> {
  const raycast = getRaycastApi();
  const detectApp = deps.detectApp ?? detectRecentBlockedApp;
  const runHelper = deps.runHelper ?? runGatekeeperHelper;
  const openSettings = deps.openSettings ?? openPrivacySecuritySettings;
  const notifyHUD = deps.notifyHUD ?? raycast.showHUD;
  const notifyToast =
    deps.notifyToast ??
    (async (opts) => {
      await raycast.showToast(opts);
    });

  const failureStyle = raycast.Toast?.Style?.Failure ?? "FAILURE";
  const animatedStyle = raycast.Toast?.Style?.Animated ?? "ANIMATED";

  try {
    // 1. Detect the specific blocked application or installer
    const detectedApp = await detectApp({ timeoutMs: 1500 });

    if (!detectedApp || !detectedApp.name) {
      // When detection returns no verified app, offer immediate manual navigation
      await notifyToast({
        style: animatedStyle,
        title: "No Blocked App Identified",
        message: "Opening Privacy & Security so you can review and approve manually...",
      });
      await openSettings();
      return "no_blocked_app";
    }

    // 2. Attempt activation of the Open Anyway control for the verified target application
    const result = await runHelper("--activate", detectedApp.name);

    if (result.status === "confirmation_pending") {
      const appName = result.appName || detectedApp.name;
      await notifyHUD(`Apple confirmation prompt is active for "${appName}" — complete Touch ID or password prompt.`);
      return "confirmation_pending";
    }

    if (result.status === "success") {
      const appName = result.appName || detectedApp.name;
      await notifyHUD(`Activated Open Anyway for "${appName}" — complete Apple's native confirmation.`);
      return "success";
    }

    if (result.status === "permission_denied") {
      await notifyToast({
        style: failureStyle,
        title: "Accessibility Permission Required",
        message: "Enable Accessibility for Raycast in Privacy & Security to automate Open Anyway.",
      });
      await openSettings();
      return "permission_denied";
    }

    if (
      result.status === "target_mismatch" ||
      result.status === "target_unresolved" ||
      result.status === "target_missing"
    ) {
      await notifyToast({
        style: failureStyle,
        title: "Target Verification Failed",
        message: `${result.message} Opening Privacy & Security for manual approval...`,
      });
      await openSettings();
      return result.status === "target_mismatch" ? "target_mismatch" : "target_unresolved";
    }

    if (result.status === "activation_failed") {
      await notifyToast({
        style: failureStyle,
        title: "Activation Failed",
        message:
          "Found 'Open Anyway' button in System Settings, but could not activate it. Opening Settings for manual approval...",
      });
      await openSettings();
      return "activation_failed";
    }

    if (result.status === "not_found") {
      await notifyToast({
        style: failureStyle,
        title: "Approval Control Not Found",
        message: `No 'Open Anyway' button found in System Settings for "${detectedApp.name}". Opening Privacy & Security...`,
      });
      await openSettings();
      return "not_found";
    }

    // Generic error fallback
    await notifyToast({
      style: failureStyle,
      title: "Could Not Activate Open Anyway",
      message: result.message || "Opening Privacy & Security for manual approval...",
    });
    await openSettings();
    return "error";
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : "Unknown error";
    await notifyToast({
      style: failureStyle,
      title: "Open Anyway Error",
      message: errorDetails,
    });
    return "error";
  }
}

/**
 * Open Anyway Raycast Command Entry Point
 */
export default async function Command() {
  await handleOpenAnywayFlow();
}
