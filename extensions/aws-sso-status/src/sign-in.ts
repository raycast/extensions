import { coordinator, metadataStore, saveSnapshot } from "./runtime";
import { scopeFor } from "./aws/coordinator";
import { OperationBusyError, sessionKey } from "./aws/store";
import { showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import { CliError } from "./aws/cli";
import { loginProfile } from "./aws/login";
import { Settings, SsoProfile } from "./aws/types";
/** Shared by list, menu, and quick command so errors and post-login checks stay consistent. */
export async function signInWithToast(profile: SsoProfile, settings: Settings) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Signing In to AWS",
    message: `${profile.name} · ${"Complete authentication in your browser."}`,
  });
  function setRecoveryActions() {
    toast.primaryAction = {
      title: "Retry",
      onAction: () =>
        launchCommand({
          name: "aws-sso-sign-in",
          type: LaunchType.UserInitiated,
          arguments: { profile: profile.name },
        }),
    };
    toast.secondaryAction = {
      title: "Open AWS SSO Status",
      onAction: () => launchCommand({ name: "aws-sso-status", type: LaunchType.UserInitiated }),
    };
  }
  try {
    const result = await loginProfile(profile, settings, metadataStore);
    const snapshot = await coordinator.refresh(settings, { onlySession: sessionKey(profile, scopeFor(settings)) });
    saveSnapshot(settings, snapshot);
    const usable = ["Signed In", "Expiring Soon"].includes(result.status);
    toast.style = usable ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = usable ? "AWS Sign-In Completed" : "Credentials Not Ready After Sign-In";
    toast.message = result.message ? result.message : `${profile.name} · ${result.status}`;
    if (!usable) setRecoveryActions();
    return result;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "AWS Sign-In Failed";
    toast.message =
      error instanceof CliError || error instanceof OperationBusyError
        ? error.message
        : "Check your AWS CLI configuration and try again.";
    setRecoveryActions();
    return undefined;
  }
}
