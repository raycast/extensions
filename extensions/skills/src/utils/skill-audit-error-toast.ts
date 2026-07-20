import { Clipboard, Keyboard, open, showToast, Toast } from "@raycast/api";

import {
  buildSecurityAuditGitHubIssueUrl,
  formatSkillAuditErrorDetails,
  type SkillAuditErrorDetails,
} from "./skill-audits";

const ERROR_TOAST_TIMEOUT_MS = 10_000;

type ShowSkillAuditErrorToastOptions = {
  error: Error;
  errorDetails: SkillAuditErrorDetails;
  skillName: string;
  onRetry: () => void;
};

export async function showSkillAuditErrorToast({
  error,
  errorDetails,
  skillName,
  onRetry,
}: ShowSkillAuditErrorToastOptions): Promise<void> {
  const reportIssueShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "i" };

  const secondaryAction =
    errorDetails.kind === "parse"
      ? {
          title: "Report Issue",
          shortcut: reportIssueShortcut,
          onAction: () => {
            void open(buildSecurityAuditGitHubIssueUrl({ skillName, errorDetails, error }));
          },
        }
      : {
          title: "Copy Error Details",
          shortcut: Keyboard.Shortcut.Common.Copy,
          onAction: () => {
            void Clipboard.copy(formatSkillAuditErrorDetails({ skillName, errorDetails }));
          },
        };

  const toast = await showToast({
    style: Toast.Style.Failure,
    title: errorDetails.title,
    message: errorDetails.message,
    primaryAction: {
      title: "Retry",
      shortcut: { modifiers: ["cmd"], key: "r" },
      onAction: (toast) => {
        void toast.hide();
        onRetry();
      },
    },
    secondaryAction,
  });

  setTimeout(() => {
    void toast.hide();
  }, ERROR_TOAST_TIMEOUT_MS);
}
