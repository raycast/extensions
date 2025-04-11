import { Action, ActionPanel, Color, Icon, List, Toast, confirmAlert, open, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { WeChatManager } from "./utils/wechatManager";

interface StateType {
  isLoading: boolean;
  isWeChatInstalled: boolean;
  isWeChatRunning: boolean;
  isWeChatTweakInstalled: boolean;
  isHomebrewInstalled: boolean;
  isWeChatServiceRunning: boolean;
}

function ManageTweak() {
  const [state, setState] = useState<StateType>({
    isLoading: true,
    isWeChatInstalled: false,
    isWeChatRunning: false,
    isWeChatTweakInstalled: false,
    isHomebrewInstalled: false,
    isWeChatServiceRunning: false,
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const [isHomebrewInstalled, isWeChatInstalled, isWeChatRunning, isWeChatTweakInstalled, isWeChatServiceRunning] =
        await Promise.all([
          WeChatManager.isHomebrewInstalled(),
          WeChatManager.isWeChatInstalled(),
          WeChatManager.isWeChatRunning(),
          WeChatManager.isWeChatTweakInstalled(),
          WeChatManager.isWeChatServiceRunning(),
        ]);

      setState({
        isLoading: false,
        isHomebrewInstalled,
        isWeChatInstalled,
        isWeChatRunning,
        isWeChatTweakInstalled,
        isWeChatServiceRunning,
      });
    } catch (error) {
      console.error("Error checking status:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
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
      await confirmAlert({
        icon: { source: Icon.Download },
        title: "Install WeChatTweak",
        message: "This will install WeChatTweak using Homebrew. Continue?",
        primaryAction: {
          title: "Install",
        },
      });

      await showToast({
        style: Toast.Style.Animated,
        title: "Installing WeChatTweak...",
      });

      await WeChatManager.installWeChatTweak();
      await checkStatus();
    } catch (error) {
      console.error("Failed to install WeChatTweak:", error);
    }
  };

  const handleUninstallTweak = async () => {
    try {
      await confirmAlert({
        icon: { source: Icon.Trash },
        title: "Uninstall WeChatTweak",
        message: "Are you sure you want to uninstall WeChatTweak?",
        primaryAction: {
          title: "Uninstall",
        },
      });

      await showToast({
        style: Toast.Style.Animated,
        title: "Uninstalling WeChatTweak...",
      });

      await WeChatManager.uninstallWeChatTweak();
      await checkStatus();
    } catch (error) {
      console.error("Failed to uninstall WeChatTweak:", error);
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
                <Action title="Install Wechat" icon={Icon.Download} onAction={handleInstallWeChat} />
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
                <Action title="Start Wechat" icon={Icon.Play} onAction={handleStartWeChat} />
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
                  <Action title="Uninstall Wechattweak" onAction={handleUninstallTweak} />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              icon={{ source: Icon.Download }}
              title="Install WeChatTweak"
              actions={
                <ActionPanel>
                  <Action title="Install Wechattweak" onAction={handleInstallTweak} />
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
                <Action title="Restart Wechat" onAction={handleRestart} />
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
          title="Report an WeChat Raycast Extension Issue"
          actions={
            <ActionPanel>
              <Action title="Open Issue Page" onAction={() => open("https://github.com/RaffeYang/wechat/issues")} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Bug }}
          title="Report an WeChatTweak Issue"
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
