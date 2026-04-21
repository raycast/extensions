import { Icon, LaunchProps, LaunchType, Toast, confirmAlert, launchCommand, showHUD, showToast } from "@raycast/api";

import { IVPN } from "@/api/ivpn";
import { IvpnInvalidAccountIdError, IvpnNotLoggedInError } from "@/api/ivpn/errors";
import { isValidAccountId } from "@/api/ivpn/utils";
import { withNoViewErrorHandler } from "@/utils/errorHandler";

type Props = LaunchProps<{ arguments: Arguments.Login }>;

export default withNoViewErrorHandler(async ({ arguments: { accountId } }: Props) => {
  if (!isValidAccountId(accountId)) {
    showToast({
      title: "Invalid Account ID",
      message: `Valid formats:\n\`i-XXXX-XXXX-XXXX\` or \`ivpnXXXXXXXX\``,
      style: Toast.Style.Failure,
    });
    return;
  }

  showToast({ title: "Logging in...", style: Toast.Style.Animated });

  let accountInfo;
  let isAuthenticated = false;
  try {
    accountInfo = await IVPN.getAccountInfo();
    isAuthenticated = true;
  } catch (err) {
    if (!(err instanceof IvpnNotLoggedInError)) {
      throw err;
    }
  }

  if (isAuthenticated && accountInfo!.accountId === accountId) {
    showToast({ title: "You are already logged in under this ID" });
    return;
  }

  if (isAuthenticated) {
    const confirmed = await confirmAlert({
      title: "Currently logged in",
      message: "Log out from current account?",
      icon: Icon.Logout,
      primaryAction: { title: "Confirm" },
    });

    if (!confirmed) {
      showHUD("Action Cancelled");
      return;
    }

    showToast({ title: "Logging out from current account...", style: Toast.Style.Animated });

    const status = await IVPN.getStatus();
    if (status.vpnStatusSimplified !== "DISCONNECTED") {
      await IVPN.disconnect();
    }

    await IVPN.logout();

    showToast({ title: `Logging in under ${accountId}...`, style: Toast.Style.Animated });
  }

  try {
    await IVPN.login(accountId);
  } catch (err) {
    if (err instanceof IvpnInvalidAccountIdError) {
      showToast({ title: "Invalid Account ID", style: Toast.Style.Failure });
      return;
    } else {
      throw err;
    }
  }

  await showToast({
    title: "Login Successful",
    message: "Next step?",
    primaryAction: {
      title: "Browse Servers",
      onAction: async () => {
        await launchCommand({ name: "servers-list", type: LaunchType.UserInitiated });
      },
    },
    secondaryAction: {
      title: "View Account Info",
      onAction: async () => {
        await launchCommand({ name: "account-info", type: LaunchType.UserInitiated });
      },
    },
  });
});
