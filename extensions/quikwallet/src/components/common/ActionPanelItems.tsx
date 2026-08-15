import { Action, ActionPanel, Icon } from "@raycast/api";

interface CommonActionPanelItemsProps {
  onRefresh: () => void;
  onChangeWallet: () => void;
  copyItems: Array<{ title: string; content: string }>;
  pushTarget?: React.ReactNode;
  pushTitle?: string;
}

export function CommonActionPanelItems({
  onRefresh,
  onChangeWallet,
  copyItems,
  pushTarget,
  pushTitle,
}: CommonActionPanelItemsProps) {
  return (
    <ActionPanel>
      {copyItems.map((item) => (
        <Action.CopyToClipboard key={item.title} title={item.title} content={item.content} />
      ))}
      {pushTarget && pushTitle && <Action.Push title={pushTitle} icon={Icon.Upload} target={pushTarget} />}
      <Action
        title="Refresh Balance"
        icon={Icon.ArrowClockwise}
        onAction={onRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Change Wallet Address"
        icon={Icon.Switch}
        onAction={onChangeWallet}
        shortcut={{ modifiers: ["opt"], key: "w" }}
      />
    </ActionPanel>
  );
}
