import { Action, ActionPanel, Color, Icon, List, Toast, confirmAlert, open, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { StateType } from "./types";
import { EnvironmentDetector } from "./utils/environmentDetector";
import { WeChatManager } from "./utils/wechatManager";

function ManageTweak() {
  const [state, setState] = useState<StateType>({
    isLoading: true,
    isWeChatInstalled: false,
    isWeChatRunning: false,
    isWeChatTweakInstalled: false,
    isHomebrewInstalled: false,
    isWeChatServiceRunning: false,
    error: null,
  });

  const patchPath = () => {
    EnvironmentDetector.fixPath();
  };

  useEffect(() => {
    patchPath();

    // Add timeout processing to ensure that the interface does not get stuck permanently
    const timeoutId = setTimeout(() => {
      if (state.isLoading) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Loading timed out. Please try refreshing the status.",
        }));
      }
    }, 100000); // 100 second timeout

    checkStatus();

    return () => clearTimeout(timeoutId);
  }, []);

  const checkStatus = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use Promise.allSettled instead of Promise.all to ensure that the call continues even if some checks fail.
      const results = await Promise.allSettled([
        WeChatManager.isHomebrewInstalled(),
        WeChatManager.isWeChatInstalled(),
        WeChatManager.isWeChatRunning(),
        WeChatManager.isWeChatTweakInstalled(),
        WeChatManager.isWeChatServiceRunning().catch(() => false),
      ]);

      // Processing results
      const [homebrewResult, wechatInstalledResult, wechatRunningResult, tweakInstalledResult, serviceRunningResult] =
        results;

      const isHomebrewInstalled = homebrewResult.status === "fulfilled" ? homebrewResult.value : false;
      const isWeChatInstalled = wechatInstalledResult.status === "fulfilled" ? wechatInstalledResult.value : false;
      const isWeChatRunning = wechatRunningResult.status === "fulfilled" ? wechatRunningResult.value : false;
      const isWeChatTweakInstalled = tweakInstalledResult.status === "fulfilled" ? tweakInstalledResult.value : false;
      const isWeChatServiceRunning = serviceRunningResult.status === "fulfilled" ? serviceRunningResult.value : false;

      setState({
        isLoading: false,
        isHomebrewInstalled,
        isWeChatInstalled,
        isWeChatRunning,
        isWeChatTweakInstalled,
        isWeChatServiceRunning,
        error: null,
      });
    } catch (error) {
      console.error("Error checking status:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: String(error),
      }));

      await showToast({
        style: Toast.Style.Failure,
        title: "Error checking status",
        message: String(error),
      });
    }
  };

  const handleInstallHomebrew = async () => {
    try {
      await confirmAlert({
        title: "Install Homebrew",
        message: "This will open Homebrew installation page. Continue?",
        primaryAction: {
          title: "Open Installation Page",
        },
      });
      await open("https://brew.sh");
    } catch (error) {
      console.error("Failed to open Homebrew page:", error);
    }
  };

  const handleInstallWeChat = async () => {
    try {
      await confirmAlert({
        title: "Install WeChat",
        message: "This will open WeChat download page. Continue?",
        primaryAction: {
          title: "Open Download Page",
        },
      });
      await open("https://www.wechat.com");
    } catch (error) {
      console.error("Failed to open WeChat download page:", error);
    }
  };

  const handleStartWeChat = async () => {
    try {
      await WeChatManager.startWeChat();
      setTimeout(checkStatus, 1000);
    } catch (error) {
      console.error("Failed to start WeChat:", error);
    }
  };

  const handleInstallTweak = async () => {
    try {
      const confirmed = await confirmAlert({
        icon: { source: Icon.Download },
        title: "Install WeChatTweak",
        message: "This will install WeChatTweak using Homebrew. Continue?",
        primaryAction: {
          title: "Install",
        },
      });

      if (!confirmed) return;

      await showToast({
        style: Toast.Style.Animated,
        title: "Installing WeChatTweak...",
      });

      // Timeout handling
      const installPromise = WeChatManager.installWeChatTweak();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Installation process taking too long")), 30000);
      });

      try {
        await Promise.race([installPromise, timeoutPromise]);
      } catch (error) {
        console.error("Installation error or timeout:", error);

        // If it is a timeout, provide a cancellation option
        if (String(error).includes("taking too long")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Installation is taking longer than expected",
            message: "The process continues in Terminal. Please check Terminal window.",
          });
        } else {
          throw error;
        }
      }

      await checkStatus();
    } catch (error) {
      console.error("Failed to install WeChatTweak:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to install WeChatTweak",
        message: String(error),
      });
    }
  };

  const handleUninstallTweak = async () => {
    try {
      const confirmed = await confirmAlert({
        icon: { source: Icon.Trash },
        title: "Uninstall WeChatTweak",
        message: "Are you sure you want to uninstall WeChatTweak?",
        primaryAction: {
          title: "Uninstall",
        },
      });

      if (!confirmed) return;

      await showToast({
        style: Toast.Style.Animated,
        title: "Uninstalling WeChatTweak...",
      });

      // Timeout handling
      const uninstallPromise = WeChatManager.uninstallWeChatTweak();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Uninstallation process taking too long")), 30000);
      });

      try {
        await Promise.race([uninstallPromise, timeoutPromise]);
      } catch (error) {
        console.error("Uninstallation error or timeout:", error);

        // If it is a timeout, provide a cancellation option
        if (String(error).includes("taking too long")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Uninstallation is taking longer than expected",
            message: "The process continues in Terminal. Please check Terminal window.",
          });
        } else {
          throw error;
        }
      }

      await checkStatus();
    } catch (error) {
      console.error("Failed to uninstall WeChatTweak:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to uninstall WeChatTweak",
        message: String(error),
      });
    }
  };

  const handleRestart = async () => {
    try {
      await WeChatManager.restartWeChat();
      setTimeout(checkStatus, 2000);
    } catch (error) {
      console.error("Failed to restart WeChat:", error);
    }
  };

  // If there is an error, display the error message
  if (state.error) {
    return (
      <List>
        <List.EmptyView
          title="Error loading status"
          description={state.error}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={checkStatus} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Manage WeChatTweak...">
      <List.Section title="Prerequisites">
        <List.Item
          icon={{
            source: state.isHomebrewInstalled ? Icon.Circle : Icon.XMarkCircle,
            tintColor: state.isHomebrewInstalled ? Color.Green : Color.Red,
          }}
          title="Homebrew"
          accessories={[{ text: state.isHomebrewInstalled ? "Installed" : "Not Installed" }]}
          actions={
            <ActionPanel>
              {!state.isHomebrewInstalled && (
                <Action title="Install Homebrew" icon={Icon.Download} onAction={handleInstallHomebrew} />
              )}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Status">
        <List.Item
          icon={{
            source: state.isWeChatInstalled ? Icon.Circle : Icon.XMarkCircle,
            tintColor: state.isWeChatInstalled ? Color.Green : Color.Red,
          }}
          title="WeChat Installation"
          accessories={[{ text: state.isWeChatInstalled ? "Installed" : "Not Installed" }]}
          actions={
            <ActionPanel>
              {!state.isWeChatInstalled && (
                <Action title="Install WeChat" icon={Icon.Download} onAction={handleInstallWeChat} />
              )}
            </ActionPanel>
          }
        />
        <List.Item
          icon={{
            source: state.isWeChatRunning ? Icon.Circle : Icon.XMarkCircle,
            tintColor: state.isWeChatRunning ? Color.Green : Color.Red,
          }}
          title="WeChat Status"
          accessories={[{ text: state.isWeChatRunning ? "Running" : "Not Running" }]}
          actions={
            <ActionPanel>
              {!state.isWeChatRunning && state.isWeChatInstalled && (
                <Action title="Start WeChat" icon={Icon.Play} onAction={handleStartWeChat} />
              )}
            </ActionPanel>
          }
        />
        <List.Item
          icon={{
            source: state.isWeChatTweakInstalled ? Icon.Circle : Icon.XMarkCircle,
            tintColor: state.isWeChatTweakInstalled ? Color.Green : Color.Red,
          }}
          title="WeChatTweak Status"
          accessories={[{ text: state.isWeChatTweakInstalled ? "Installed" : "Not Installed" }]}
        />
      </List.Section>

      <List.Section title="Actions">
        {state.isHomebrewInstalled &&
          state.isWeChatInstalled &&
          (state.isWeChatTweakInstalled ? (
            <List.Item
              icon={{ source: Icon.Trash }}
              title="Uninstall WeChatTweak"
              actions={
                <ActionPanel>
                  <Action title="Uninstall WeChatTweak" onAction={handleUninstallTweak} />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              icon={{ source: Icon.Download }}
              title="Install WeChatTweak"
              actions={
                <ActionPanel>
                  <Action title="Install WeChatTweak" onAction={handleInstallTweak} />
                </ActionPanel>
              }
            />
          ))}

        {state.isWeChatRunning && (
          <List.Item
            icon={{ source: Icon.ArrowClockwise }}
            title="Restart WeChat"
            subtitle="Restart to apply changes"
            actions={
              <ActionPanel>
                <Action title="Restart WeChat" onAction={handleRestart} />
              </ActionPanel>
            }
          />
        )}

        <List.Item
          icon={{ source: Icon.ArrowClockwise }}
          title="Refresh Status"
          actions={
            <ActionPanel>
              <Action title="Refresh Status" onAction={checkStatus} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Help">
        <List.Item
          icon={{ source: Icon.QuestionMark }}
          title="View WeChatTweak Documentation"
          actions={
            <ActionPanel>
              <Action
                title="Open Documentation"
                onAction={() => open("https://github.com/Sunnyyoung/WeChatTweak-macOS")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Bug }}
          title="Report a WeChat Raycast Extension Issue"
          actions={
            <ActionPanel>
              <Action title="Open Issue Page" onAction={() => open("https://github.com/raycast/extensions/issues")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Bug }}
          title="Report a WeChatTweak Issue"
          actions={
            <ActionPanel>
              <Action
                title="Open Issue Page"
                onAction={() => open("https://github.com/sunnyyoung/WeChatTweak-macOS/issues")}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export default ManageTweak;
