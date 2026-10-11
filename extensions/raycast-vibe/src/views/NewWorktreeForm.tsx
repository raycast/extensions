import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { Agent } from "../agents";
import {
  addWorktree,
  branchExistsLocal,
  directoryExists,
  validateBranchName,
  worktreeDir,
} from "../worktrees";
import { launchAgent } from "../vibe";

type Values = { branch: string };

export function NewWorktreeForm({
  repoRoot,
  agent,
  onCreated,
}: {
  repoRoot: string;
  agent?: Agent;
  onCreated?: (worktreePath: string) => void;
}) {
  const { pop } = useNavigation();
  const title = agent ? `Launch ${agent.name} in New Worktree` : "New Worktree";

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              agent ? `Create and Launch ${agent.name}` : "Create Worktree"
            }
            onSubmit={async (values: Values) => {
              const validation = await validateBranchName(values.branch);
              if (!validation.ok) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Invalid branch name",
                  message: validation.reason,
                });
                return;
              }
              const branch = values.branch.trim();
              if (await branchExistsLocal(repoRoot, branch)) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Branch already exists",
                  message: `A local branch '${branch}' already exists.`,
                });
                return;
              }
              const targetDir = worktreeDir(repoRoot, branch);
              if (await directoryExists(targetDir)) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Worktree directory already exists",
                  message: targetDir,
                });
                return;
              }
              let worktreePath: string;
              try {
                worktreePath = await addWorktree(repoRoot, { branch });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not create worktree",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
                return;
              }
              await showToast({
                style: Toast.Style.Success,
                title: "Worktree created",
                message: worktreePath,
              });
              onCreated?.(worktreePath);
              if (agent) {
                await launchAgent(worktreePath, agent);
              }
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="branch"
        title="Branch Name"
        placeholder="feature/my-experiment"
      />
      {agent ? <Form.Description title="Agent" text={agent.name} /> : null}
    </Form>
  );
}
