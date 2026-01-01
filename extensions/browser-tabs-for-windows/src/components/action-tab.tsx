import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { Tab, activateTab, closeTab } from "../utils/tabs-helper";

interface ActionTabProps {
  tab: Tab;
  onTabClosed: () => void;
}

/**
 * 标签页操作菜单组件
 */
export function ActionTab({ tab, onTabClosed }: ActionTabProps) {
  const handleActivate = async () => {
    const success = await activateTab(tab.index);
    if (success) {
      await showToast({
        style: Toast.Style.Success,
        title: "已切换到标签页",
        message: tab.title,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "切换失败",
      });
    }
  };

  const handleClose = async () => {
    const success = await closeTab(tab.index);
    if (success) {
      await showToast({
        style: Toast.Style.Success,
        title: "已关闭标签页",
        message: tab.title,
      });
      onTabClosed();
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "关闭失败",
      });
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={Icon.ArrowRight}
          title="切换到标签页"
          onAction={handleActivate}
        />
        <Action
          icon={Icon.XMarkCircle}
          title="关闭标签页"
          shortcut={{ modifiers: ["ctrl"], key: "return" }}
          onAction={handleClose}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="复制标题"
          content={tab.title}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
