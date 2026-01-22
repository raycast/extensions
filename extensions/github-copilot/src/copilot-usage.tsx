import { List, Icon, Color, Action, ActionPanel, showToast, Toast, Clipboard, open } from "@raycast/api";
import { useState } from "react";
import { useCopilotUsage } from "./hooks/useCopilotUsage";
import { UsageActionPanel } from "./components/UsageActionPanel";
import { clearCopilotToken, initiateDeviceFlow, pollForAccessToken } from "./services/copilot";

function Command() {
  const { isLoading, usage, error, revalidate } = useCopilotUsage();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [userCode, setUserCode] = useState<string | null>(null);

  const needsAuth = error instanceof Error && error.name === "AuthenticationRequiredError";

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setUserCode(null);

    try {
      const deviceFlow = await initiateDeviceFlow();
      setUserCode(deviceFlow.user_code);

      await Clipboard.copy(deviceFlow.user_code);
      await open(deviceFlow.verification_uri);
      await showToast({
        style: Toast.Style.Animated,
        title: "Code copied to clipboard",
        message: `Enter ${deviceFlow.user_code} at github.com/login/device`,
      });

      await pollForAccessToken({ deviceCode: deviceFlow.device_code, interval: deviceFlow.interval });

      await showToast({ style: Toast.Style.Success, title: "Authenticated successfully" });
      setUserCode(null);
      revalidate();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogOut = async () => {
    await clearCopilotToken();
    await showToast({ style: Toast.Style.Success, title: "Logged out" });
    revalidate();
  };

  const formatUsage = (percentageUsed: number, limit: number | null): string => {
    if (limit === null) {
      return "Unlimited";
    }
    return `${percentageUsed.toFixed(1)}%`;
  };

  const getProgressColor = (percentageUsed: number, limit: number | null): Color => {
    if (limit === null) {
      return Color.Green;
    }
    if (percentageUsed >= 90) {
      return Color.Red;
    } else if (percentageUsed >= 70) {
      return Color.Orange;
    }
    return Color.Blue;
  };

  const formatResetDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if ((needsAuth && !isLoading) || isAuthenticating) {
    return (
      <List isLoading={isAuthenticating}>
        <List.Item
          icon={{ source: "github-logo.png" }}
          title={userCode ? `Enter code: ${userCode}` : "Sign in with GitHub"}
          subtitle={
            userCode
              ? "Enter this code at github.com/login/device"
              : "Log in with your GitHub account to view your Copilot usage."
          }
          actions={
            isAuthenticating ? undefined : (
              <ActionPanel>
                <Action title="Sign in with GitHub" icon={Icon.Globe} onAction={handleAuthenticate} />
              </ActionPanel>
            )
          }
        />
      </List>
    );
  }

  if (!usage && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: "copilot.svg", tintColor: Color.PrimaryText }}
          title="Usage Data Not Available"
          description={error ? error.message : "Failed to fetch usage data. Please check your connection."}
          actions={<UsageActionPanel onRefresh={revalidate} onLogOut={handleLogOut} />}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {usage && (
        <>
          <List.Section title="Copilot Usage">
            <List.Item
              title="Code completions"
              accessories={[
                {
                  text: formatUsage(usage.inlineSuggestions.percentageUsed, usage.inlineSuggestions.limit),
                  icon: {
                    source: Icon.BarChart,
                    tintColor: getProgressColor(usage.inlineSuggestions.percentageUsed, usage.inlineSuggestions.limit),
                  },
                },
              ]}
              icon={{ source: Icon.Code, tintColor: Color.PrimaryText }}
              actions={<UsageActionPanel onRefresh={revalidate} onLogOut={handleLogOut} />}
            />
            <List.Item
              title="Chat messages"
              accessories={[
                {
                  text: formatUsage(usage.chatMessages.percentageUsed, usage.chatMessages.limit),
                  icon: {
                    source: Icon.BarChart,
                    tintColor: getProgressColor(usage.chatMessages.percentageUsed, usage.chatMessages.limit),
                  },
                },
              ]}
              icon={{ source: Icon.Message, tintColor: Color.PrimaryText }}
              actions={<UsageActionPanel onRefresh={revalidate} onLogOut={handleLogOut} />}
            />
            <List.Item
              title="Premium requests"
              accessories={[
                {
                  text: formatUsage(usage.premiumRequests.percentageUsed, usage.premiumRequests.limit),
                  icon: {
                    source: Icon.BarChart,
                    tintColor: getProgressColor(usage.premiumRequests.percentageUsed, usage.premiumRequests.limit),
                  },
                },
              ]}
              icon={{ source: Icon.Star, tintColor: Color.PrimaryText }}
              actions={<UsageActionPanel onRefresh={revalidate} onLogOut={handleLogOut} />}
            />
          </List.Section>

          {usage.allowanceResetAt && (
            <List.Section title="">
              <List.Item
                title="Additional paid premium requests enabled."
                icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
                actions={<UsageActionPanel onRefresh={revalidate} onLogOut={handleLogOut} />}
              />
              <List.Item
                title={`Allowance resets ${formatResetDate(usage.allowanceResetAt)}.`}
                icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
                actions={<UsageActionPanel onRefresh={revalidate} onLogOut={handleLogOut} />}
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

export default Command;
