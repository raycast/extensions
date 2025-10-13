/**
 * Daytona Git Manager Command
 * Task 13: Complete git operations and repository management
 */

import { ActionPanel, Action, List, Icon, Form, useNavigation, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { daytonaUtils } from "./lib/daytona-utils";
import { toastUtils } from "./lib/toast-utils";

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
}

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  shortHash: string;
}

interface GitBranch {
  name: string;
  type: "local" | "remote";
  isCurrent: boolean;
  fullName: string;
}

function GitManagerCommand() {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasRepo, setHasRepo] = useState<boolean | null>(null); // null = checking, false = no repo, true = has repo
  const [repoPath, setRepoPath] = useState<string>("/home/daytona/workspace");
  const [error, setError] = useState<string | null>(null);
  const [remoteInfo, setRemoteInfo] = useState<{ hasRemote: boolean; canPush: boolean; remoteUrl: string } | null>(
    null,
  );

  useEffect(() => {
    checkGitRepository();
  }, []);

  const checkGitRepository = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await daytonaUtils.withClient(async (client) => {
        const sandboxes = await client.list();
        if (sandboxes.length === 0) throw new Error("No active sandboxes");
        const sandbox = sandboxes[0];

        const gitCheck = await sandbox.process.codeRun(
          `
import subprocess
import json
import os

try:
    workspace_dir = '/home/daytona/workspace'
    git_repo_path = None
    
    # First check if workspace exists
    if not os.path.exists(workspace_dir):
        print(json.dumps({"hasRepo": False, "error": "Workspace directory not found"}))
        exit()
    
    # Check if workspace itself is a git repo
    result = subprocess.run(['git', 'rev-parse', '--git-dir'], 
                          cwd=workspace_dir, capture_output=True, text=True)
    
    if result.returncode == 0:
        git_repo_path = workspace_dir
    else:
        # Check subdirectories for git repositories
        for item in os.listdir(workspace_dir):
            item_path = os.path.join(workspace_dir, item)
            if os.path.isdir(item_path):
                git_check = subprocess.run(['git', 'rev-parse', '--git-dir'], 
                                         cwd=item_path, capture_output=True, text=True)
                if git_check.returncode == 0:
                    git_repo_path = item_path
                    break
    
    if git_repo_path:
        # Also get basic info immediately for faster display
        branch = subprocess.run(['git', 'branch', '--show-current'], 
                              cwd=git_repo_path, capture_output=True, text=True)
        
        print(json.dumps({
            "hasRepo": True,
            "repoPath": git_repo_path,
            "branch": branch.stdout.strip() or "main"
        }))
    else:
        print(json.dumps({"hasRepo": False}))
        
except Exception as e:
    print(json.dumps({"error": str(e), "hasRepo": False}))
        `.trim(),
        );

        const output = gitCheck.result || "";
        return JSON.parse(output);
      });

      if (result.error && !result.hasRepo) {
        setError(result.error);
      }

      setHasRepo(result.hasRepo);
      if (result.hasRepo && result.repoPath) {
        setRepoPath(result.repoPath);
        // Set basic status immediately for faster UX
        if (result.branch) {
          setGitStatus({
            branch: result.branch,
            ahead: 0,
            behind: 0,
            staged: [],
            modified: [],
            untracked: [],
          });
        }
        // Load detailed data in background with the correct repo path
        loadGitData(result.repoPath);
        // Check remote info for smart UI
        checkRemoteAccess(result.repoPath);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setHasRepo(false);
    } finally {
      setLoading(false);
    }
  };

  const checkRemoteAccess = async (pathOverride?: string) => {
    try {
      const result = await daytonaUtils.withClient(async (client) => {
        const sandboxes = await client.list();
        const sandbox = sandboxes[0];

        const remoteCheck = await sandbox.process.codeRun(
          `
import subprocess
import json
import os

try:
    os.chdir('${pathOverride || repoPath}')
    
    # Get remote URL
    remote_result = subprocess.run(['git', 'remote', 'get-url', 'origin'], 
                                 capture_output=True, text=True)
    
    has_remote = remote_result.returncode == 0
    remote_url = remote_result.stdout.strip() if has_remote else ""
    
    # Quick connectivity test (lightweight)
    can_push = False
    if has_remote:
        # Test if we can reach the remote (this is lightweight and doesn't require auth)
        ls_remote = subprocess.run(['git', 'ls-remote', '--heads', 'origin'], 
                                 capture_output=True, text=True, timeout=5)
        can_push = ls_remote.returncode == 0
    
    print(json.dumps({
        "hasRemote": has_remote,
        "canPush": can_push,
        "remoteUrl": remote_url
    }))
    
except Exception as e:
    print(json.dumps({
        "hasRemote": False, 
        "canPush": False, 
        "remoteUrl": "",
        "error": str(e)
    }))
        `.trim(),
        );

        const output = remoteCheck.result || "";
        return JSON.parse(output);
      });

      setRemoteInfo({
        hasRemote: result.hasRemote || false,
        canPush: result.canPush || false,
        remoteUrl: result.remoteUrl || "",
      });
    } catch (error) {
      console.error("Remote check failed:", error);
      setRemoteInfo({ hasRemote: false, canPush: false, remoteUrl: "" });
    }
  };

  const loadGitData = async (pathOverride?: string) => {
    try {
      const result = await daytonaUtils.withClient(async (client) => {
        const sandboxes = await client.list();
        const sandbox = sandboxes[0];

        const gitData = await sandbox.process.codeRun(
          `
import subprocess
import json
import os

try:
    repo_path = '${pathOverride || repoPath}'
    os.chdir(repo_path)
    
    # Get detailed status
    status = subprocess.run(['git', 'status', '--porcelain=v1'], capture_output=True, text=True)
    branch = subprocess.run(['git', 'branch', '--show-current'], capture_output=True, text=True)
    
    # Parse status
    staged, modified, untracked = [], [], []
    for line in status.stdout.strip().split('\\n'):
        if not line: continue
        status_code = line[:2]
        filename = line[3:]
        
        if status_code[0] in 'AMDRC': staged.append(filename)
        if status_code[1] in 'MD': modified.append(filename)
        if status_code == '??': untracked.append(filename)
    
    # Get commits
    log = subprocess.run(['git', 'log', '--oneline', '-10', '--pretty=format:%H|%h|%s|%an|%ad', '--date=relative'], 
                       capture_output=True, text=True)
    
    commits = []
    if log.returncode == 0 and log.stdout.strip():
        for line in log.stdout.strip().split('\\n'):
            if line and line.strip():
                parts = line.split('|')
                if len(parts) >= 5:
                    commits.append({
                        'hash': parts[0],
                        'shortHash': parts[1], 
                        'message': parts[2],
                        'author': parts[3],
                        'date': parts[4]
                    })
    else:
        # No commits in repository or git log failed
        commits = []
    
    result_data = {
        "branch": branch.stdout.strip(),
        "staged": staged,
        "modified": modified, 
        "untracked": untracked,
        "commits": commits,
        "repoPath": repo_path,
        "debug": {
            "git_log_returncode": log.returncode,
            "git_log_stdout_length": len(log.stdout) if log.stdout else 0,
            "git_log_stderr": log.stderr if log.stderr else "",
            "commits_count": len(commits)
        }
    }
    print(json.dumps(result_data))
    
except Exception as e:
    print(json.dumps({"error": str(e)}))
        `.trim(),
        );

        const output = gitData.result || "";
        return JSON.parse(output);
      });

      setGitStatus({
        branch: result.branch || "main",
        ahead: 0,
        behind: 0,
        staged: result.staged || [],
        modified: result.modified || [],
        untracked: result.untracked || [],
      });

      // Debug commits loading
      console.log("Git data result:", result);
      if (result.debug) {
        console.log("Git log debug info:", result.debug);
      }
      console.log("Commits from result:", result.commits, "count:", result.commits?.length || 0);
      setCommits(result.commits || []);
    } catch (error) {
      console.error("Error loading git data:", error);
      // Ensure commits are cleared on error
      setCommits([]);
    }
  };

  const executeGitCommand = async (command: string, successMessage: string) => {
    await daytonaUtils.executeWithToast(
      async () => {
        await daytonaUtils.withClient(async (client) => {
          const sandboxes = await client.list();
          const sandbox = sandboxes[0];

          const result = await sandbox.process.codeRun(
            `
import subprocess
import os
import json

try:
    os.chdir('${repoPath}')
    result = subprocess.run(${JSON.stringify(command.split(" "))}, capture_output=True, text=True)
    
    if result.returncode != 0:
        stderr = result.stderr.lower()
        
        # Parse common git errors for better user feedback
        if 'authentication failed' in stderr or 'invalid username or password' in stderr:
            error_msg = "Authentication failed: Please set up SSH keys or personal access token for this repository"
        elif 'permission denied (publickey)' in stderr:
            error_msg = "SSH authentication failed: Please add your SSH key to the repository settings"
        elif 'permission denied' in stderr or 'access denied' in stderr:
            error_msg = "Permission denied: You don't have write access to this repository"
        elif 'repository not found' in stderr:
            error_msg = "Repository not found: Check if the repository exists and you have access"
        elif 'network' in stderr or 'connection' in stderr or 'timeout' in stderr:
            error_msg = "Network error: Check your internet connection"
        elif 'non-fast-forward' in stderr:
            error_msg = "Push rejected: Pull latest changes first, then try pushing again"
        else:
            error_msg = f"Git error: {result.stderr}"
        
        print(json.dumps({"success": False, "error": error_msg}))
    else:
        print(json.dumps({"success": True}))
        
except Exception as e:
    print(json.dumps({"success": False, "error": f"Command failed: {str(e)}"}))
          `.trim(),
          );

          const output = result.result || "";
          const parsed = JSON.parse(output);

          if (!parsed.success) {
            throw new Error(parsed.error);
          }
        });
        await loadGitData();
      },
      "Executing git command...",
      successMessage,
    );
  };

  // Show loading state while checking for repository
  if (hasRepo === null) {
    return (
      <List isLoading={true} searchBarPlaceholder="Checking for git repository...">
        <List.EmptyView
          title="Checking Git Repository"
          description="Scanning workspace for git repositories..."
          icon={Icon.MagnifyingGlass}
        />
      </List>
    );
  }

  // Show no repository state
  if (hasRepo === false) {
    return (
      <List searchBarPlaceholder="No git repository found">
        <List.EmptyView
          title="No Git Repository"
          description={error || "Clone a repository from the Dashboard to use git operations"}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={checkGitRepository} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search git operations...">
      {gitStatus && (
        <>
          <List.Section title="Repository Status">
            <List.Item
              title={`Branch: ${gitStatus.branch}`}
              subtitle={`${gitStatus.staged.length} staged • ${gitStatus.modified.length} modified • ${gitStatus.untracked.length} untracked`}
              icon={Icon.Tree}
              actions={
                <ActionPanel>
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadGitData} />
                  <Action.Push
                    title="Commit Changes"
                    icon={Icon.CheckCircle}
                    target={<CommitForm onCommit={loadGitData} repoPath={repoPath} />}
                  />
                  <ActionPanel.Section title="Remote Operations">
                    {remoteInfo?.hasRemote ? (
                      <>
                        <Action
                          title={remoteInfo.canPush ? "Push" : "Push (Auth Required)"}
                          icon={remoteInfo.canPush ? Icon.ArrowUp : Icon.ExclamationMark}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                          onAction={() => executeGitCommand("git push", "Changes pushed successfully")}
                        />
                        <Action
                          title={remoteInfo.canPush ? "Pull" : "Pull (Auth Required)"}
                          icon={remoteInfo.canPush ? Icon.ArrowDown : Icon.ExclamationMark}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                          onAction={() => executeGitCommand("git pull", "Changes pulled successfully")}
                        />
                        {remoteInfo.remoteUrl && (
                          <Action
                            title={`Remote: ${remoteInfo.remoteUrl.replace("https://github.com/", "").replace(".git", "")}`}
                            icon={Icon.Link}
                            onAction={() => {}}
                          />
                        )}
                      </>
                    ) : (
                      <Action title="No Remote Repository" icon={Icon.QuestionMark} onAction={() => {}} />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Branch Management">
                    <Action.Push
                      title="Manage Branches"
                      icon={Icon.Tree}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                      target={<BranchManager repoPath={repoPath} onBranchChange={loadGitData} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />

            {gitStatus.staged.length > 0 && (
              <List.Item
                title={`${gitStatus.staged.length} Staged Files`}
                subtitle={gitStatus.staged.slice(0, 3).join(", ")}
                icon={Icon.CheckCircle}
                actions={
                  <ActionPanel>
                    <Action
                      title="Unstage All"
                      icon={Icon.Minus}
                      onAction={() => executeGitCommand("git reset HEAD .", "Files unstaged")}
                    />
                  </ActionPanel>
                }
              />
            )}

            {gitStatus.modified.length > 0 && (
              <List.Item
                title={`${gitStatus.modified.length} Modified Files`}
                subtitle={gitStatus.modified.slice(0, 3).join(", ")}
                icon={Icon.Pencil}
                actions={
                  <ActionPanel>
                    <Action
                      title="Stage All"
                      icon={Icon.Plus}
                      onAction={() => executeGitCommand("git add .", "Files staged")}
                    />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>

          <List.Section title={`Recent Commits (${commits.length})`}>
            {commits.map((commit) => (
              <List.Item
                key={commit.hash}
                title={commit.message}
                subtitle={`${commit.shortHash} • ${commit.author}`}
                icon={Icon.Dot}
                accessories={[{ text: commit.date }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Commit"
                      icon={Icon.Eye}
                      target={<CommitDetail commit={commit} repoPath={repoPath} />}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function CommitForm({ onCommit, repoPath }: { onCommit: () => void; repoPath: string }) {
  const [message, setMessage] = useState("");
  const { pop } = useNavigation();

  const handleCommit = async () => {
    if (!message.trim()) {
      toastUtils.error("Commit message is required");
      return;
    }

    await daytonaUtils.executeWithToast(
      async () => {
        await daytonaUtils.withClient(async (client) => {
          const sandboxes = await client.list();
          const sandbox = sandboxes[0];

          await sandbox.process.codeRun(
            `
import subprocess
import os

try:
    os.chdir('${repoPath}')
    result = subprocess.run(['git', 'commit', '-m', '${message.replace(/'/g, "\\'")}'], 
                          capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    else:
        print("Commit successful")
except Exception as e:
    print(f"Error: {str(e)}")
          `.trim(),
          );
        });
        onCommit();
        pop();
      },
      "Creating commit...",
      "Commit created successfully",
    );
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Create Commit" icon={Icon.Check} onAction={handleCommit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Commit Message"
        placeholder="Enter commit message..."
        value={message}
        onChange={setMessage}
      />
    </Form>
  );
}

function CommitDetail({ commit, repoPath }: { commit: GitCommit; repoPath: string }) {
  const [diff, setDiff] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommitDiff();
  }, []);

  const loadCommitDiff = async () => {
    try {
      const result = await daytonaUtils.withClient(async (client) => {
        const sandboxes = await client.list();
        const sandbox = sandboxes[0];

        const diffResult = await sandbox.process.codeRun(
          `
import subprocess
import os
import json

try:
    os.chdir('${repoPath}')
    
    # Get commit stats
    stats_result = subprocess.run(['git', 'show', '--stat', '--format=', '${commit.hash}'], 
                                capture_output=True, text=True)
    
    # Get file changes (simplified diff)
    files_result = subprocess.run(['git', 'show', '--name-status', '${commit.hash}'], 
                                capture_output=True, text=True)
    
    output = {
        "stats": stats_result.stdout.strip(),
        "files": files_result.stdout.strip(),
        "success": True
    }
    
    if stats_result.returncode != 0 or files_result.returncode != 0:
        output["error"] = f"Stats error: {stats_result.stderr}, Files error: {files_result.stderr}"
        output["success"] = False
    
    print(json.dumps(output))
    
except Exception as e:
    print(json.dumps({"error": str(e), "success": False}))
        `.trim(),
        );

        const output = diffResult.result || "";
        const parsed = JSON.parse(output);

        if (!parsed.success) {
          return `Error: ${parsed.error || "Unknown error loading commit details"}`;
        }

        const statsSection = parsed.stats ? `## File Statistics\n\n\`\`\`\n${parsed.stats}\n\`\`\`\n\n` : "";
        const filesSection = parsed.files ? `## Changed Files\n\n\`\`\`\n${parsed.files}\n\`\`\`\n\n` : "";

        return statsSection + filesSection;
      });

      setDiff(result);
    } catch (error) {
      console.error("Error loading commit details:", error);
      setDiff("Error loading commit details: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Detail
      isLoading={loading}
      markdown={`# ${commit.message}\n\n**Author:** ${commit.author}  \n**Date:** ${commit.date}  \n**Hash:** \`${commit.hash}\`\n\n${diff}`}
      navigationTitle={`Commit: ${commit.shortHash}`}
    />
  );
}

function BranchManager({ repoPath, onBranchChange }: { repoPath: string; onBranchChange: () => void }) {
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [, setCurrentBranch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  // const { } = useNavigation(); // No navigation functions needed currently

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const result = await daytonaUtils.withClient(async (client) => {
        const sandboxes = await client.list();
        const sandbox = sandboxes[0];

        const branchData = await sandbox.process.codeRun(
          `
import subprocess
import json
import os

try:
    os.chdir('${repoPath}')
    
    # Get current branch
    current = subprocess.run(['git', 'branch', '--show-current'], capture_output=True, text=True)
    current_branch = current.stdout.strip()
    
    # Get all branches (local and remote)
    all_branches = subprocess.run(['git', 'branch', '-a', '--format=%(refname:short)'], 
                                capture_output=True, text=True)
    
    branches = []
    seen_remotes = set()
    
    for branch in all_branches.stdout.strip().split('\\n'):
        branch = branch.strip()
        if not branch or branch == 'HEAD':
            continue
            
        if branch.startswith('origin/'):
            # Remote branch
            local_name = branch.replace('origin/', '')
            # Only show remote branch if no local equivalent exists
            if local_name not in [b.strip() for b in all_branches.stdout.strip().split('\\n')]:
                if local_name not in seen_remotes:
                    branches.append({
                        'name': local_name,
                        'fullName': branch,
                        'type': 'remote',
                        'isCurrent': False
                    })
                    seen_remotes.add(local_name)
        else:
            # Local branch
            branches.append({
                'name': branch,
                'fullName': branch,
                'type': 'local', 
                'isCurrent': branch == current_branch
            })
    
    print(json.dumps({
        "current": current_branch,
        "branches": branches
    }))
    
except Exception as e:
    print(json.dumps({"error": str(e)}))
        `.trim(),
        );

        const output = branchData.result || "";
        return JSON.parse(output);
      });

      setCurrentBranch(result.current || "main");
      setBranches(result.branches || []);
    } catch (error) {
      toastUtils.apiError(error);
    } finally {
      setLoading(false);
    }
  };

  const switchBranch = async (branch: GitBranch) => {
    const action = branch.type === "local" ? "checkout" : "checkout and track";
    // Command would be: git checkout ${branch.name} or git checkout -b ${branch.name} ${branch.fullName}

    await daytonaUtils.executeWithToast(
      async () => {
        await daytonaUtils.withClient(async (client) => {
          const sandboxes = await client.list();
          const sandbox = sandboxes[0];

          await sandbox.process.codeRun(
            `
import subprocess
import os

try:
    os.chdir('${repoPath}')
    ${
      branch.type === "local"
        ? `result = subprocess.run(['git', 'checkout', '${branch.name}'], capture_output=True, text=True)`
        : `result = subprocess.run(['git', 'checkout', '-b', '${branch.name}', '${branch.fullName}'], capture_output=True, text=True)`
    }
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    else:
        print("Branch operation successful")
except Exception as e:
    print(f"Error: {str(e)}")
          `.trim(),
          );
        });
        onBranchChange();
      },
      `${action === "checkout" ? "Switching to" : "Creating and switching to"} ${branch.name}...`,
      `${action === "checkout" ? "Switched to" : "Created and switched to"} branch ${branch.name}`,
    );
  };

  const localBranches = branches.filter((b) => b.type === "local");
  const remoteBranches = branches.filter((b) => b.type === "remote");

  return (
    <List isLoading={loading} navigationTitle="Git Branches" searchBarPlaceholder="Search branches...">
      <List.Section title={`Local Branches (${localBranches.length})`}>
        {localBranches.map((branch) => (
          <List.Item
            key={branch.fullName}
            title={branch.name}
            subtitle={branch.isCurrent ? "Current branch" : ""}
            icon={branch.isCurrent ? Icon.CheckCircle : Icon.Circle}
            actions={
              <ActionPanel>
                {!branch.isCurrent && (
                  <Action title="Switch to Branch" icon={Icon.ArrowRight} onAction={() => switchBranch(branch)} />
                )}
                <Action.Push
                  title="Create New Branch"
                  icon={Icon.Plus}
                  target={<CreateBranchForm repoPath={repoPath} onSuccess={loadBranches} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {remoteBranches.length > 0 && (
        <List.Section title={`Remote Branches (${remoteBranches.length})`}>
          {remoteBranches.map((branch) => (
            <List.Item
              key={branch.fullName}
              title={branch.name}
              subtitle={`from ${branch.fullName}`}
              icon={Icon.Cloud}
              actions={
                <ActionPanel>
                  <Action
                    title="Checkout as New Local Branch"
                    icon={Icon.ArrowRight}
                    onAction={() => switchBranch(branch)}
                  />
                  <Action.Push
                    title="Create New Branch"
                    icon={Icon.Plus}
                    target={<CreateBranchForm repoPath={repoPath} onSuccess={loadBranches} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function CreateBranchForm({ repoPath, onSuccess }: { repoPath: string; onSuccess: () => void }) {
  const [branchName, setBranchName] = useState("");
  const { pop } = useNavigation();

  const createBranch = async () => {
    if (!branchName.trim()) {
      toastUtils.error("Branch name is required");
      return;
    }

    await daytonaUtils.executeWithToast(
      async () => {
        await daytonaUtils.withClient(async (client) => {
          const sandboxes = await client.list();
          const sandbox = sandboxes[0];

          await sandbox.process.codeRun(
            `
import subprocess
import os

try:
    os.chdir('${repoPath}')
    result = subprocess.run(['git', 'checkout', '-b', '${branchName.trim()}'], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    else:
        print("Branch created and switched successfully")
except Exception as e:
    print(f"Error: {str(e)}")
          `.trim(),
          );
        });
        onSuccess();
        pop();
      },
      `Creating branch ${branchName}...`,
      `Created and switched to branch ${branchName}`,
    );
  };

  return (
    <Form
      navigationTitle="Create New Branch"
      actions={
        <ActionPanel>
          <Action title="Create Branch" icon={Icon.Plus} onAction={createBranch} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="branchName"
        title="Branch Name"
        placeholder="feature/new-feature"
        value={branchName}
        onChange={setBranchName}
      />
    </Form>
  );
}

export default GitManagerCommand;
