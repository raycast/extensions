import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useHerdrSnapshot } from "../hooks/use-herdr-snapshot";
import { runHerdr } from "../lib/herdr";
import { ErrorView, runAction } from "../lib/ui";

export function CreateWorktreeForm({
  initialWorkspaceId,
  onDone,
}: {
  initialWorkspaceId?: string;
  onDone?: () => void | Promise<void>;
}) {
  const snapshot = useHerdrSnapshot();
  const { pop } = useNavigation();
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId || "");
  const [branch, setBranch] = useState("");
  const [base, setBase] = useState("");
  const [path, setPath] = useState("");
  const [label, setLabel] = useState("");
  const [focus, setFocus] = useState(true);
  const [branchError, setBranchError] = useState<string>();

  if (snapshot.error && !snapshot.data) return <ErrorView error={snapshot.error} onRetry={snapshot.revalidate} />;
  const workspaces = snapshot.data?.workspaces || [];
  const selectedWorkspace = workspaceId || workspaces[0]?.workspace_id || "";

  async function submit() {
    if (!branch.trim()) {
      setBranchError("Enter a branch name.");
      return;
    }
    const success = await runAction(
      "Creating worktree",
      async () => {
        const args = ["worktree", "create", "--workspace", selectedWorkspace, "--branch", branch.trim()];
        if (base.trim()) args.push("--base", base.trim());
        if (path.trim()) args.push("--path", path.trim());
        if (label.trim()) args.push("--label", label.trim());
        args.push(focus ? "--focus" : "--no-focus", "--json");
        await runHerdr(args, { timeout: 120_000 });
      },
      { success: "Worktree Created", onSuccess: onDone },
    );
    if (success) pop();
  }

  if (!snapshot.isLoading && workspaces.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Folder}
          title="No Source Workspace"
          description="Create a workspace for a Git repository first."
        />
      </List>
    );
  }

  return (
    <Form
      navigationTitle="Create Git Worktree"
      isLoading={snapshot.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Worktree" icon={Icon.Hammer} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="workspace" title="Source Workspace" value={selectedWorkspace} onChange={setWorkspaceId}>
        {workspaces.map((workspace) => (
          <Form.Dropdown.Item key={workspace.workspace_id} value={workspace.workspace_id} title={workspace.label} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="branch"
        title="Branch"
        placeholder="feature/raycast"
        value={branch}
        onChange={(value) => {
          setBranch(value);
          setBranchError(undefined);
        }}
        error={branchError}
        autoFocus
      />
      <Form.TextField id="base" title="Base Ref" placeholder="HEAD (default)" value={base} onChange={setBase} />
      <Form.TextField
        id="path"
        title="Checkout Path"
        placeholder="Use Herdr's configured worktree directory"
        value={path}
        onChange={setPath}
      />
      <Form.TextField
        id="label"
        title="Workspace Label"
        placeholder="Defaults to the branch"
        value={label}
        onChange={setLabel}
      />
      <Form.Checkbox id="focus" label="Focus the new worktree workspace" value={focus} onChange={setFocus} />
      <Form.Description text="Existing local branches are checked out; otherwise Herdr creates the branch from Base Ref or HEAD." />
    </Form>
  );
}
