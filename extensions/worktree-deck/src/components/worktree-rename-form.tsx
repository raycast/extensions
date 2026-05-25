import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import type { Worktree } from "../composition-root";
import { normalizeWorktreeBranchName } from "./worktree-ui-utils";

/**
 * worktree ブランチ名変更フォームを表示する
 */
export function RenameWorktreeForm({
  item,
  onRename,
}: {
  item: Worktree;
  onRename: (args: { item: Worktree; newBranch: string; renameRemoteBranch: boolean }) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const oldBranch = normalizeWorktreeBranchName(item.branch);

  const handleSubmit = async (values: RenameWorktreeFormValues) => {
    if (!oldBranch) {
      throw new Error("Current branch is not available.");
    }
    await onRename({
      item,
      newBranch: values.newBranch,
      renameRemoteBranch: values.renameRemoteBranch,
    });
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Branch" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Worktree" text={item.path} />
      <Form.Description title="Current Branch" text={oldBranch ?? "not detected"} />
      <Form.TextField id="newBranch" title="New Branch Name" defaultValue={oldBranch ?? ""} />
      <Form.Checkbox id="renameRemoteBranch" label="Rename remote branch" defaultValue={false} />
    </Form>
  );
}

type RenameWorktreeFormValues = {
  newBranch: string;
  renameRemoteBranch: boolean;
};
