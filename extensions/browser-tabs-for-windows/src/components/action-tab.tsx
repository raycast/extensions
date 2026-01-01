import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { Tab, activateTab, closeTab } from "../utils/tabs-helper";

interface ActionTabProps {
  tab: Tab;
  onTabClosed: () => void;
  onRefresh?: () => void;
}

/**
 * 标签页操作菜单组件
 */
export function ActionTab({ tab, onTabClosed, onRefresh }: ActionTabProps) {
  const handleActivate = async () => {
    const success = await activateTab(tab.index);
    if (success) {
      // 激活成功后刷新列表，确保状态更新 (例如最近访问顺序)
      onTabClosed();
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
    // 乐观更新：立刻通知列表关闭，不等待后端返回
    // 但因为 mutate 是异步且会重新 fetch，所以其实这里主要是触发动作
    const success = await closeTab(tab.index);
    if (success) {
      // 移除 Toast 通知，实现静默关闭
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
          shortcut={{ modifiers: ["ctrl"], key: "c" }}
        />
        <Action
          icon={Icon.RotateClockwise}
          title="刷新列表"
          shortcut={{ modifiers: ["ctrl"], key: "r" }}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
