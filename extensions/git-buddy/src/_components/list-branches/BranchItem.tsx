import { List, ActionPanel, Action, Icon } from "@raycast/api";

interface BranchItemProps {
  branch: { name: string; isLocal: boolean };
  isActive: boolean;
  onCheckout: (branchName: string) => void;
  onWritePrDescription: (branchName: string) => void;
  onDeleteBranch: (branchName: string) => void;
  onCleanupBranches: () => void;
}

export function BranchItem({
  branch,
  isActive,
  onCheckout,
  onWritePrDescription,
  onDeleteBranch,
  onCleanupBranches,
}: BranchItemProps) {
  const cleanedBranch = branch.name.replace(/^\* /, "");
  const accessories = [];

  if (isActive) {
    accessories.push({ text: "🟢 Active Branch" });
  }

  if (branch.isLocal) {
    accessories.push({ text: "⚠︎ Untracked" });
  }

  return (
    <List.Item
      title={cleanedBranch}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Checkout Branch" onAction={() => onCheckout(cleanedBranch)} icon={Icon.ArrowRightCircle} />
          <Action
            title="Write PR Description → This Branch"
            onAction={() => onWritePrDescription(cleanedBranch)}
            icon={Icon.Pencil}
          />
          <Action.CopyToClipboard
            title="Copy Branch Name"
            content={cleanedBranch}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            icon={Icon.CopyClipboard}
          />
          <Action
            title="Delete Branch"
            onAction={() => onDeleteBranch(cleanedBranch)}
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
          <Action
            title="Clean Up Branches"
            onAction={onCleanupBranches}
            icon={Icon.Eraser}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          />
        </ActionPanel>
      }
    />
  );
}
