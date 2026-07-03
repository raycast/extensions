import { Action, ActionPanel, Keyboard } from "@raycast/api";
import path from "node:path";
import { ReactNode } from "react";
import { OwnerRepo } from "../lib/git";

interface WorkflowFileActionPanelSectionProps {
  /** Absolute local path to the repo root. */
  repoPath: string;
  /** Path to the workflow file, either absolute or relative to the repo root (e.g. `.github/workflows/ci.yml`). */
  workflowFilePath: string;
  /** Resolved GitHub owner/repo/host, if known yet. Browser action is hidden until this is available. */
  ownerRepo?: OwnerRepo;
  /** Branch/ref to view the file at on GitHub. Browser action is hidden until this is available. */
  branch?: string;
  /** Extra `<Action>` items (e.g. "Re-Run Workflow") to render in this same section, before the file actions. */
  children?: ReactNode;
}

/**
 * Shared actions for a workflow YAML file: viewing it on GitHub at a given branch/ref, and opening
 * it locally with the OS's default handler (e.g. the user's code editor). Reused by both the
 * "List Workflows" (run history) and "Run Workflow" (dispatchable workflows) commands.
 */
export default function WorkflowFileActionPanelSection({
  repoPath,
  workflowFilePath,
  ownerRepo,
  branch,
  children,
}: WorkflowFileActionPanelSectionProps) {
  const absolutePath = path.isAbsolute(workflowFilePath) ? workflowFilePath : path.join(repoPath, workflowFilePath);
  const workflowFileName = path.basename(absolutePath);
  const browserUrl = buildBrowserUrl(repoPath, absolutePath, ownerRepo, branch);

  return (
    <ActionPanel.Section title={workflowFileName}>
      {children}
      {browserUrl && (
        <Action.OpenInBrowser title="Open in Browser" url={browserUrl} shortcut={Keyboard.Shortcut.Common.Open} />
      )}
      <Action.OpenWith title="Open with…" path={absolutePath} shortcut={Keyboard.Shortcut.Common.OpenWith} />
    </ActionPanel.Section>
  );
}

function buildBrowserUrl(
  repoPath: string,
  absolutePath: string,
  ownerRepo: OwnerRepo | undefined,
  branch: string | undefined,
): string | undefined {
  if (!ownerRepo || !branch) return undefined;

  const relativePath = path.relative(repoPath, absolutePath).split(path.sep).join("/");
  return `https://${ownerRepo.host}/${ownerRepo.owner}/${ownerRepo.repo}/blob/${encodeURIComponent(branch)}/${relativePath}`;
}
