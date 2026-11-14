import { Clipboard, showToast, Toast } from "@raycast/api";
import { openCommand } from "./commands";
import { buildDebugReport, redactSensitiveText, type DiagnosticContext } from "../core/diagnostics";
import { describeError, type ErrorFix } from "../core/errors";

export async function showTranslationError(
  error: unknown,
  context: DiagnosticContext,
  onRetry?: () => void,
): Promise<void> {
  const report = buildDebugReport(error, context);
  console.error(report);
  const { title, message, fix } = describeError(error);
  const copyDebugInfo = copyDebugInfoAction(report);
  const primary = fixAction(fix, onRetry);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: redactSensitiveText(message, context.providers),
    primaryAction: primary ?? copyDebugInfo,
    ...(primary ? { secondaryAction: copyDebugInfo } : {}),
  });
}

function fixAction(fix: ErrorFix, onRetry: (() => void) | undefined): Toast.ActionOptions | undefined {
  if (fix === "open_preferences") {
    return {
      title: "Manage Providers",
      onAction: () => {
        void openCommand("manage-providers");
      },
    };
  }
  if (fix === "retry" && onRetry) {
    return { title: "Retry", onAction: () => onRetry() };
  }
  return undefined;
}

function copyDebugInfoAction(report: string): Toast.ActionOptions {
  return {
    title: "Copy Debug Info",
    onAction: () => {
      void Clipboard.copy(report).then(() => showToast({ style: Toast.Style.Success, title: "Debug info copied" }));
    },
  };
}
