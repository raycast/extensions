import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { formatLaunchDiagnostics, type LaunchDiagnosticsReport } from "./launch-diagnostics";
import type { LaunchExecutionResult } from "./launch-executor";
import type { WorkspaceHealthIssue } from "./workspace-health";
import { formatHealthIssues } from "./workspace-health";

export async function showWorkspaceValidationFailure(message: string): Promise<void> {
  await showFailureToast(new Error(message), { title: "Workspace is not ready" });
}

export async function showHealthFailure(
  issues: WorkspaceHealthIssue[],
  diagnostics?: LaunchDiagnosticsReport,
): Promise<void> {
  const message = formatHealthIssues(issues);
  await showFailureToast(new Error(message), {
    title: "Cannot open workspace",
    primaryAction: diagnostics
      ? {
          title: "Copy Diagnostics",
          onAction: async () => {
            await Clipboard.copy(formatLaunchDiagnostics(diagnostics));
            await showToast({ style: Toast.Style.Success, title: "Diagnostics copied" });
          },
        }
      : undefined,
  });
}

export async function showLaunchFailure(
  result: Extract<LaunchExecutionResult, { ok: false }>,
  diagnostics?: LaunchDiagnosticsReport,
): Promise<void> {
  await showFailureToast(result.cause ?? new Error(result.message), {
    title: "Launch failed",
    primaryAction: diagnostics
      ? {
          title: "Copy Diagnostics",
          onAction: async () => {
            await Clipboard.copy(
              formatLaunchDiagnostics({
                ...diagnostics,
                message: result.message,
              }),
            );
            await showToast({ style: Toast.Style.Success, title: "Diagnostics copied" });
          },
        }
      : undefined,
  });
}

export async function showAuthorizationFailure(message: string, diagnostics: LaunchDiagnosticsReport): Promise<void> {
  await showFailureToast(new Error(message), {
    title: "Launch blocked",
    primaryAction: {
      title: "Copy Diagnostics",
      onAction: async () => {
        await Clipboard.copy(formatLaunchDiagnostics(diagnostics));
        await showToast({ style: Toast.Style.Success, title: "Diagnostics copied" });
      },
    },
  });
}

export async function showLaunchSuccess(title: string, message: string): Promise<void> {
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

export async function showStorageFailure(action: string, error: unknown): Promise<void> {
  await showFailureToast(error, { title: `${action} failed` });
}
