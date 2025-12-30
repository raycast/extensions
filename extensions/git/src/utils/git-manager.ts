import {
  CleanOptions,
  DiffNameStatus,
  DiffResult,
  DiffResultBinaryFile,
  DiffResultNameStatusFile,
  DiffResultTextFile,
  FileStatusResult,
  ResetMode,
  simpleGit,
  SimpleGit,
} from "simple-git";
import { showToast, Toast, getPreferenceValues, Alert, confirmAlert } from "@raycast/api";
import { readFileSync, writeFileSync, mkdtempSync, chmodSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import {
  Branch,
  FileStatus,
  Commit,
  Stash,
  BranchesState,
  DetachedHead,
  CommitFileChange,
  Preferences,
  RebasePlanItem,
  FileChangeStats,
  StatusState,
  MergeMode,
  PatchScope,
  RepositoryCloningProcess,
  RepositoryCloningState,
  Tag,
  StatusMode,
  StashScope,
} from "../types";
import { basename, join } from "path";
import { promises as fs } from "fs";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import { shellEnvironmentVariables } from "./environment-utils";

/**
 * Manager for Git operations within a repository.
 * Provides a high-level API for all Git operations.
 */
export class GitManager {
  private git: SimpleGit;
  public readonly repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath, {
      errors: (error, _result) => {
        if (error) {
          showFailureToast(error, { title: `Error running command` });
        }
        return error;
      },
    });

    this.git = this.git.env(shellEnvironmentVariables);

    // Global logging of all git commands for debugging
    this.setupGlobalLogging();
  }

  /**
   * Gets the repository name from the path.
   */
  get repoName(): string {
    return basename(this.repoPath) || "Unknown Repository";
  }

  static validateDirectory(repoPath: string) {
    if (!existsSync(repoPath)) {
      throw new Error(`Directory does not exist: ${repoPath}`);
    }

    const gitPath = join(repoPath, ".git");
    if (!existsSync(gitPath)) {
      throw new Error(`Not a Git repository: ${repoPath}`);
    }
  }

  /**
   * Sets up global logging of git commands and streaming output.
   */
  private setupGlobalLogging(): void {
    this.git.outputHandler((command, stdout, stderr, args) => {
      const ignoredCommands = ["ls-files", "ls-remote", "remote"];
      // Skip logging for ls-files command
      if (ignoredCommands.some((command) => args.includes(command))) {
        return;
      }

      const command_description = `${command} ${args.join(" ")}`;

      // Log the full command for debugging
      console.log(`[GIT] ${command_description}`);

      showToast({ style: Toast.Style.Animated, title: command_description, message: "Running..." });

      let lastOutput = "";

      // Process stdout (standard output)
      stdout.on("data", (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          lastOutput = output;
        }
      });

      // Process stderr (errors)
      stderr.on("data", (data: Buffer) => {
        const error = data.toString().trim();
        if (error) {
          lastOutput = error;
          showToast({ style: Toast.Style.Animated, title: error });
          console.warn(`[GIT STDERR] ${error}.\nCommand: ${command_description}`);
        }
      });

      // Show the final result on completion
      stdout.on("end", () => {
        if (lastOutput) {
          showToast({ style: Toast.Style.Success, title: command_description, message: lastOutput });
        }
      });
    });
  }

  /**
   * Gets the branches state including current branch, detached HEAD, local and remote branches.
   */
  async getBranches(): Promise<BranchesState> {
    const summary = await this.git.branch(["--all", "-vv", "--sort=-committerdate"]);

    const parseBranchInfo = (
      label: string,
    ): {
      ahead: number;
      behind: number;
      upstream?: { name: string; fullName: string; remote: string };
      isGone?: boolean;
    } => {
      // Single regex to parse all possible branch info patterns with named groups
      // Handles: no upstream, [upstream], [upstream: ahead X], [upstream: behind Y], [upstream: ahead X, behind Y], [upstream: gone]
      const match = label.match(
        /(?:\[(?<upstream>.*?)(?:: (?:ahead (?<ahead>\d+))?(?:, )?(?:behind (?<behind>\d+))?(?<gone>gone)?)?\])?/,
      );

      if (!match?.groups) {
        return { ahead: 0, behind: 0 };
      }

      return {
        ahead: match.groups.ahead ? parseInt(match.groups.ahead, 10) : 0,
        behind: match.groups.behind ? parseInt(match.groups.behind, 10) : 0,
        upstream: match.groups.upstream
          ? {
              name: match.groups.upstream.split("/").slice(1).join("/"),
              fullName: match.groups.upstream,
              remote: match.groups.upstream.split("/")[0],
            }
          : undefined,
        isGone: !!match.groups.gone,
      };
    };

    let currentBranchName = summary.current;
    if (summary.current && summary.current.startsWith("(no")) {
      const headNamePath = join(this.repoPath, ".git", "rebase-merge", "head-name");
      const headNameContent = await fs.readFile(headNamePath, "utf-8");
      currentBranchName = headNameContent.trim().replace(/^refs\/heads\//, "");
    }

    let currentBranch: Branch | undefined;
    let detachedHead: DetachedHead | undefined;
    const localBranches: Branch[] = [];
    const remoteBranches: Record<string, Branch[]> = {};

    // Handle detached HEAD state
    if (summary.detached === true) {
      // In detached HEAD, summary.current contains the commit hash
      const commitHash = summary.current || "unknown";

      // Get current commit info for detached HEAD
      const currentCommitInfo = await this.git.show(["--format=%s|%cd", "--no-patch", "HEAD"]);
      const [message, dateStr] = currentCommitInfo.split("|");

      detachedHead = {
        commitHash,
        shortCommitHash: commitHash,
        commitMessage: message?.trim() || "No commit message",
        commitDate: dateStr ? new Date(dateStr) : new Date(),
      };
    } else if (summary.current) {
      // Current Branch
      const currentBranchDetails = summary.branches[summary.current];
      if (currentBranchDetails) {
        const { ahead, behind, upstream, isGone } = parseBranchInfo(currentBranchDetails.label);

        currentBranch = {
          name: currentBranchName,
          displayName: currentBranchName,
          type: "current",
          ahead,
          behind,
          upstream,
          isGone,
          lastCommitMessage: this.extractCommitMessage(currentBranchDetails.label),
          lastCommitHash: currentBranchDetails.commit,
        };
      }
    }

    const maxBranchesToLoad = parseInt(getPreferenceValues<Preferences>().maxBranchesToLoad);

    // Local Branches
    Object.values(summary.branches).forEach((branch) => {
      if (!branch.name.startsWith("remotes/") && !branch.current) {
        if (localBranches.length >= maxBranchesToLoad) return;

        const { ahead, behind, upstream, isGone } = parseBranchInfo(branch.label);

        localBranches.push({
          name: branch.name,
          displayName: branch.name,
          type: "local",
          ahead,
          behind,
          upstream,
          isGone,
          lastCommitMessage: this.extractCommitMessage(branch.label),
          lastCommitHash: branch.commit,
        });
      }
    });

    // Remote Branches
    Object.values(summary.branches).forEach((branch) => {
      if (branch.name.startsWith("remotes/")) {
        const remoteNameParts = branch.name.replace("remotes/", "").split("/");
        const remote = remoteNameParts.shift();
        if (!remote) return;

        const branchName = remoteNameParts.join("/");
        // Avoid adding remote HEAD pointers
        if (branchName === "HEAD" || !branchName) return;

        if (!remoteBranches[remote]) {
          remoteBranches[remote] = [];
        }

        if (remoteBranches[remote].length >= maxBranchesToLoad) return;

        remoteBranches[remote].push({
          name: branchName,
          displayName: `${remote}/${branchName}`,
          type: "remote",
          remote,
          upstream: undefined,
          lastCommitMessage: this.extractCommitMessage(branch.label),
          lastCommitHash: branch.commit,
        });
      }
    });

    return {
      currentBranch,
      detachedHead,
      localBranches,
      remoteBranches,
    };
  }

  /**
   * Gets the status of files in the repository using detailed FileStatusResult.
   */
  async getStatus(): Promise<StatusState> {
    const status = await this.git.status();
    const files: FileStatus[] = [];

    // Process each file using detailed status information
    for (const fileStatus of status.files) {
      const fileEntries = this.parseFileStatus(fileStatus);
      files.push(...fileEntries);
    }

    const interactiveRebaseMergePath = join(this.repoPath, ".git", "rebase-merge");
    const nonInteractiveRebaseMergePath = join(this.repoPath, ".git", "rebase-apply");
    const mergeHeadPath = join(this.repoPath, ".git", "MERGE_HEAD");
    const squashMessagePath = join(this.repoPath, ".git", "SQUASH_MSG");
    const cherryPickHeadPath = join(this.repoPath, ".git", "CHERRY_PICK_HEAD");
    const revertHeadPath = join(this.repoPath, ".git", "REVERT_HEAD");

    let mode: StatusMode;

    if (existsSync(interactiveRebaseMergePath)) {
      mode = {
        kind: "rebase",
        conflict: existsSync(join(interactiveRebaseMergePath, "conflict")),
        current: await fs
          .readFile(join(interactiveRebaseMergePath, "msgnum"), "utf-8")
          .then((content) => parseInt(content.trim()) || 0),
        total: await fs
          .readFile(join(interactiveRebaseMergePath, "end"), "utf-8")
          .then((content) => parseInt(content.trim()) || 0),
      };
    } else if (existsSync(nonInteractiveRebaseMergePath)) {
      mode = {
        kind: "rebase",
        conflict: existsSync(join(nonInteractiveRebaseMergePath, "conflict")),
        current: await fs
          .readFile(join(nonInteractiveRebaseMergePath, "next"), "utf-8")
          .then((content) => parseInt(content.trim()) || 0),
        total: await fs
          .readFile(join(nonInteractiveRebaseMergePath, "last"), "utf-8")
          .then((content) => parseInt(content.trim()) || 0),
      };
    } else if (existsSync(mergeHeadPath)) {
      mode = { kind: "merge" };
    } else if (existsSync(cherryPickHeadPath)) {
      mode = { kind: "cherryPick" };
    } else if (existsSync(revertHeadPath)) {
      mode = { kind: "revert" };
    } else if (existsSync(squashMessagePath)) {
      mode = { kind: "squash" };
    } else {
      mode = { kind: "regular" };
    }

    return { branch: status.current, files, mode };
  }

  /**
   * Parses a FileStatusResult into one or more FileStatus entries.
   * A single file can appear in both staged and unstaged states.
   *
   * Git status format:
   * - index (first char): status in staged area
   * - working_dir (second char): status in working directory
   *
   * Common combinations:
   * - ' M' = modified in working directory only (unstaged)
   * - 'M ' = modified in index only (staged)
   * - 'MM' = modified in both index and working directory (staged + unstaged)
   * - 'A ' = added to index (staged)
   * - ' A' = added to working directory (unstaged, untracked)
   * - 'D ' = deleted from index (staged)
   * - ' D' = deleted from working directory (unstaged)
   * - 'R ' = renamed in index (staged)
   * - 'C ' = copied in index (staged)
   * - 'UU' = unmerged, both modified (conflicted)
   * - '??' = untracked file (unstaged)
   */
  private parseFileStatus(fileStatus: FileStatusResult): FileStatus[] {
    const results: FileStatus[] = [];
    const { index, working_dir, path, from } = fileStatus;

    // Helper function to create file status object
    const createFileStatus = (
      status: FileStatus["status"],
      type: FileStatus["type"],
      isConflicted: boolean = false,
    ): FileStatus => ({
      absolutePath: this.getAbsolutePath(path),
      relativePath: path,
      status,
      type,
      oldPath: from ? this.getAbsolutePath(from) : undefined,
      isConflicted,
    });

    // Explicit handling of all possible index + working_dir combinations
    const combination = `${index}${working_dir}`;

    switch (combination) {
      // ============================================================================
      // CONFLICT STATES (unmerged files)
      // ============================================================================
      case "DD": // unmerged, both deleted
        results.push(createFileStatus("staged", "deleted", true));
        results.push(createFileStatus("unstaged", "deleted", true));
        break;

      case "AU": // unmerged, added by us
        results.push(createFileStatus("staged", "added", true));
        results.push(createFileStatus("unstaged", "modified", true));
        break;

      case "UD": // unmerged, deleted by them
        results.push(createFileStatus("staged", "modified", true));
        results.push(createFileStatus("unstaged", "deleted", true));
        break;

      case "UA": // unmerged, added by them
        results.push(createFileStatus("staged", "modified", true));
        results.push(createFileStatus("unstaged", "added", true));
        break;

      case "DU": // unmerged, deleted by us
        results.push(createFileStatus("staged", "deleted", true));
        results.push(createFileStatus("unstaged", "modified", true));
        break;

      case "AA": // unmerged, both added
        results.push(createFileStatus("staged", "added", true));
        results.push(createFileStatus("unstaged", "added", true));
        break;

      case "UU": // unmerged, both modified
        results.push(createFileStatus("staged", "modified", true));
        results.push(createFileStatus("unstaged", "modified", true));
        break;

      // ============================================================================
      // NORMAL STATES - STAGED ONLY
      // ============================================================================
      case "A ": // added to index
        results.push(createFileStatus("staged", "added"));
        break;

      case "M ": // modified in index
        results.push(createFileStatus("staged", "modified"));
        break;

      case "D ": // deleted from index
        results.push(createFileStatus("staged", "deleted"));
        break;

      case "R ": // renamed in index
        results.push(createFileStatus("staged", "renamed"));
        break;

      case "C ": // copied in index
        results.push(createFileStatus("staged", "copied"));
        break;

      case "T ": // file type changed in index
        results.push(createFileStatus("staged", "modified"));
        break;

      // ============================================================================
      // NORMAL STATES - UNSTAGED ONLY
      // ============================================================================
      case " M": // modified in working directory
        results.push(createFileStatus("unstaged", "modified"));
        break;

      case " D": // deleted in working directory
        results.push(createFileStatus("unstaged", "deleted"));
        break;

      case " T": // file type changed in working directory
        results.push(createFileStatus("unstaged", "modified"));
        break;

      case "??": // untracked file
        results.push(createFileStatus("untracked", "added"));
        break;

      case "!!": // ignored file (should not normally appear in status)
        // Skip ignored files
        break;

      // ============================================================================
      // NORMAL STATES - BOTH STAGED AND UNSTAGED
      // ============================================================================
      case "MM": // modified in both index and working directory
        results.push(createFileStatus("staged", "modified"));
        results.push(createFileStatus("unstaged", "modified"));
        break;

      case "AM": // added in index, modified in working directory
        results.push(createFileStatus("staged", "added"));
        results.push(createFileStatus("unstaged", "modified"));
        break;

      case "AD": // added in index, deleted in working directory
        results.push(createFileStatus("staged", "added"));
        results.push(createFileStatus("unstaged", "deleted"));
        break;

      case "MD": // modified in index, deleted in working directory
        results.push(createFileStatus("staged", "modified"));
        results.push(createFileStatus("unstaged", "deleted"));
        break;

      case "RM": // renamed in index, modified in working directory
        results.push(createFileStatus("staged", "renamed"));
        results.push(createFileStatus("unstaged", "modified"));
        break;

      case "RD": // renamed in index, deleted in working directory
        results.push(createFileStatus("staged", "renamed"));
        results.push(createFileStatus("unstaged", "deleted"));
        break;

      case "CM": // copied in index, modified in working directory
        results.push(createFileStatus("staged", "copied"));
        results.push(createFileStatus("unstaged", "modified"));
        break;

      case "CD": // copied in index, deleted in working directory
        results.push(createFileStatus("staged", "copied"));
        results.push(createFileStatus("unstaged", "deleted"));
        break;

      // ============================================================================
      // EDGE CASES AND UNKNOWN COMBINATIONS
      // ============================================================================
      default:
        // Log unexpected combinations for debugging
        console.error(`Unknown Git status combination: "${combination}" for file: ${path}`);
        break;
    }

    return results;
  }

  /**
   * Extracts commit message from branch label.
   * Branch label can contain upstream info like "[origin/main: ahead 2] commit message"
   * or just the commit message without upstream info.
   */
  private extractCommitMessage(label: string): string {
    // The label format from git branch -vv is usually:
    // "commit_message" or "[upstream: ahead/behind info] commit_message"

    // Remove upstream information in brackets [upstream: ahead/behind info]
    const cleanLabel = label.replace(/^\[.*?\]\s*/, "").trim();

    // If there's still content, it's the commit message, otherwise use a default
    return cleanLabel || "No commit message";
  }

  /**
   * Parses git commit refs string into categorized ref types.
   */
  private parseCommitRefs(refsString: string | undefined): {
    localBranches: string[];
    remoteBranches: { name: string; remote: string; fullName: string }[];
    tags: string[];
    currentBranchName?: string;
  } {
    const result = {
      localBranches: [] as string[],
      remoteBranches: [] as { name: string; remote: string; fullName: string }[],
      tags: [] as string[],
      currentBranchName: undefined as string | undefined,
    };

    if (!refsString || !refsString.trim()) {
      return result;
    }

    const refs = refsString.split(", ").map((ref) => ref.trim());

    for (const ref of refs) {
      if (ref.startsWith("tag:")) {
        // Extract tag name: "tag: v1.0.0" -> "v1.0.0"
        const tagName = ref.replace(/^tag:\s*refs\/tags\//, "").trim();
        if (tagName) {
          result.tags.push(tagName);
        }
      } else if (ref.includes("HEAD ->")) {
        // Current branch: "HEAD -> main" or "origin/HEAD -> origin/main"
        const match = ref.match(/HEAD\s*->\s*refs\/heads\/(.+)/);
        if (!match) continue;

        const branchName = match[1].trim();
        result.currentBranchName = branchName;
      } else if (!ref.endsWith("HEAD")) {
        if (ref.startsWith("refs/remotes/")) {
          // Extract subpath from ref without "refs/remotes/"
          const remoteBranch = ref.replace(/^refs\/remotes\//, "");
          result.remoteBranches.push({
            name: remoteBranch.split("/").slice(1).join("/"),
            remote: remoteBranch.split("/")[0],
            fullName: remoteBranch,
          });
        } else if (ref.startsWith("refs/heads/")) {
          const localBranch = ref.replace(/^refs\/heads\//, "");
          result.localBranches.push(localBranch);
        }
      }
    }

    return result;
  }

  /**
   * Gets the last commit from the repository.
   */
  async getLastCommit(): Promise<Commit | null> {
    const log = await this.git.log(["--max-count=1", "--name-status", "--decorate=full"]);

    if (!log.latest) return null;

    const commit = log.latest;
    const changedFiles = this.parseCommitChangedFiles(commit.diff!);
    const parsedRefs = this.parseCommitRefs(commit.refs);

    return {
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      message: commit.message,
      body: commit.body,
      author: commit.author_name,
      authorEmail: commit.author_email,
      date: new Date(commit.date),
      localBranches: parsedRefs.localBranches,
      remoteBranches: parsedRefs.remoteBranches,
      tags: parsedRefs.tags,
      currentBranchName: parsedRefs.currentBranchName,
      changedFiles,
    };
  }

  /**
   * Gets the commit history with optional offset for pagination.
   * @param branch Branch name to get commits from (optional)
   * @param page Page number for pagination (optional, default 0)
   */
  async getCommits(branch?: string, page: number = 0): Promise<Commit[]> {
    const commitsPerPage = parseInt(getPreferenceValues<Preferences>().commitsPerPage);
    const log = await this.git.log([
      `--max-count=${commitsPerPage}`,
      `--skip=${page * commitsPerPage}`,
      "--name-status",
      "--first-parent",
      ...(branch ? [branch] : ["--all"]),
      "--decorate=full",
    ]);

    return log.all.map(
      (commit: {
        hash: string;
        message: string;
        body: string;
        author_name: string;
        author_email: string;
        date: string;
        refs?: string;
        diff?: DiffResult;
      }) => {
        const changedFiles = this.parseCommitChangedFiles(commit.diff!);
        const parsedRefs = this.parseCommitRefs(commit.refs);

        return {
          hash: commit.hash,
          shortHash: commit.hash.substring(0, 7),
          message: commit.message,
          body: commit.body,
          author: commit.author_name,
          authorEmail: commit.author_email,
          date: new Date(commit.date),
          localBranches: parsedRefs.localBranches,
          remoteBranches: parsedRefs.remoteBranches,
          tags: parsedRefs.tags,
          currentBranchName: parsedRefs.currentBranchName,
          changedFiles,
        };
      },
    );
  }

  /**
   * Returns the first parent hash of a given commit or null if none (root commit).
   */
  async getFirstParentOfCommit(commitHash: string): Promise<string | null> {
    const output = await this.git.raw(["rev-list", "--parents", "-n", "1", commitHash]);
    const parts = output.trim().split(/\s+/);
    // Format: <child> <parent1> [parent2 ...]
    if (parts.length >= 2) {
      return parts[1];
    }
    return null;
  }

  /**
   * Gets commits in chronological order from the specified start commit (inclusive) up to HEAD.
   */
  async getCommitsSince(startHash: string): Promise<Commit[]> {
    const parent = await this.getFirstParentOfCommit(startHash);

    const options = ["--reverse", "--name-status", "--decorate=full"];

    if (parent) {
      options.push(`${parent}..HEAD`);
    } else {
      // Root commit selected: include full history to HEAD
      options.push("--all");
    }

    const log = await this.git.log(options);

    return log.all.map(
      (commit: {
        hash: string;
        message: string;
        body: string;
        author_name: string;
        author_email: string;
        date: string;
        refs?: string;
        diff?: DiffResult;
      }) => {
        const changedFiles = this.parseCommitChangedFiles(commit.diff!);
        const parsedRefs = this.parseCommitRefs(commit.refs);

        return {
          hash: commit.hash,
          shortHash: commit.hash.substring(0, 7),
          message: commit.message,
          body: commit.body,
          author: commit.author_name,
          authorEmail: commit.author_email,
          date: new Date(commit.date),
          localBranches: parsedRefs.localBranches,
          remoteBranches: parsedRefs.remoteBranches,
          tags: parsedRefs.tags,
          currentBranchName: parsedRefs.currentBranchName,
          changedFiles,
        } as Commit;
      },
    );
  }

  /**
   * Performs an interactive rebase with a prepared plan. The plan order defines the new history order.
   * For reword, the new message will be applied using an exec amend step.
   */
  async interactiveRebase(startHash: string, plan: RebasePlanItem[]): Promise<void> {
    // Build rebase todo content based on plan
    const todoLines: string[] = [];

    for (const item of plan) {
      const action = item.action;
      const hash = item.hash;

      switch (action) {
        case "pick":
          todoLines.push(`pick ${hash}`);
          break;
        case "drop":
          todoLines.push(`drop ${hash}`);
          break;
        case "edit":
          todoLines.push(`edit ${hash}`);
          break;
        case "squash":
          todoLines.push(`squash ${hash}`);
          break;
        case "fixup":
          todoLines.push(`fixup ${hash}`);
          break;
        case "reword":
          // Use pick + exec amend to set message non-interactively
          todoLines.push(`pick ${hash}`);
          if (item.newMessage) {
            // Escape double quotes and backslashes for safe shell embedding
            const escaped = item.newMessage.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            todoLines.push(`exec git commit --amend -m "${escaped}"`);
          } else {
            throw new Error("No new message provided for reword action in interactive rebase plan");
          }
          break;
      }
    }

    // Create temporary sequence editor script that writes our todo
    const tempDirectory = mkdtempSync(join(tmpdir(), "raycast-git-"));
    const editorPath = join(tempDirectory, "sequence-editor.sh");
    // Use template literal to generate shell script for sequence editor
    const script = `#!/bin/sh
TODO_FILE="$1"
/bin/cat > "$TODO_FILE" <<'__REBASE_TODO__'
${todoLines.join("\n")}
__REBASE_TODO__
`;
    writeFileSync(editorPath, script, { encoding: "utf-8" });
    // Set executable permissions for the script: 0o755 means rwxr-xr-x (owner can read/write/execute, group and others can read/execute)
    chmodSync(editorPath, 0o755);

    try {
      const parentCommit = await this.getFirstParentOfCommit(startHash);
      const options = ["-c", `sequence.editor=${editorPath}`, "rebase", "--interactive"];
      if (parentCommit) {
        options.push(parentCommit);
      } else {
        options.push("--root");
      }
      await this.git.raw(options);
    } finally {
      try {
        rmSync(tempDirectory, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }

  /**
   * Parses the changed files from git log --name-status diff output.
   */
  private parseCommitChangedFiles(diff: DiffResult): CommitFileChange[] {
    // Helper function to map DiffNameStatus to typed status names
    function mapDiffNameStatusToTypedStatus(status: DiffNameStatus): CommitFileChange["status"] {
      switch (status) {
        case DiffNameStatus.ADDED:
          return "added";
        case DiffNameStatus.MODIFIED:
          return "modified";
        case DiffNameStatus.DELETED:
          return "deleted";
        case DiffNameStatus.RENAMED:
          return "renamed";
        case DiffNameStatus.COPIED:
          return "copied";
        case DiffNameStatus.CHANGED:
          return "changed";
        default:
          // Fallback for any unexpected status
          return "modified";
      }
    }

    if (!diff || !diff.files) {
      return [];
    }

    return diff.files.map((file: DiffResultTextFile | DiffResultBinaryFile | DiffResultNameStatusFile) => {
      if ("status" in file && file.status) {
        return {
          status: mapDiffNameStatusToTypedStatus(file.status),
          path: file.file,
          oldPath: file.from,
        };
      }

      throw new Error("Failed to parse commit changed files: unknown diff format");
    });
  }

  /**
   * Returns per-file change statistics (insertions & deletions) for the specified commit.
   */
  async getCommitFileStats(commitHash: string): Promise<Record<string, FileChangeStats>> {
    const summary = await this.git.diffSummary([`${commitHash}^`, commitHash]);

    const stats: Record<string, FileChangeStats> = {};

    for (const file of summary.files) {
      // Skip binary files as they don't have insertions/deletions counts
      if ("binary" in file && file.binary === true) {
        continue;
      }

      const filePath = (file as DiffResultTextFile).file;
      const insertions = (file as DiffResultTextFile).insertions || 0;
      const deletions = (file as DiffResultTextFile).deletions || 0;

      if (insertions === 0 && deletions === 0) {
        continue;
      }

      stats[filePath] = { insertions, deletions };
    }

    return stats;
  }

  /**
   * Checks out the specified branch.
   */
  async checkoutLocalBranch(branchName: string): Promise<void> {
    await this.git.checkout(branchName);
  }

  async checkoutRemoteBranch(branchName: string, upstream: string): Promise<void> {
    await this.git.checkout(["--track", "-B", branchName, upstream]);
  }

  /**
   * Checks out a specific commit (creates detached HEAD state).
   */
  async checkoutCommit(commitHash: string): Promise<void> {
    await this.git.checkout(commitHash);
  }

  /**
   * Creates a new branch.
   */
  async createBranch(name: string): Promise<void> {
    await this.git.checkoutLocalBranch(name);
  }

  /**
   * Deletes a local branch.
   */
  async deleteBranch(name: string): Promise<void> {
    await this.git.deleteLocalBranch(name, true);
  }

  /**
   * Deletes a remote branch.
   */
  async deleteRemoteBranch(remote: string, branchName: string): Promise<void> {
    await this.git.push(remote, branchName, ["--delete"]);
  }

  /**
   * Adds a file to the staging area.
   */
  async stageFile(file: string): Promise<void> {
    await this.git.add(file);
  }

  /**
   * Resolves a conflict by accepting the specified side's version.
   */
  async resolveConflict(filePath: string, side: "ours" | "theirs"): Promise<void> {
    switch (side) {
      case "ours":
        await this.git.raw(["checkout", "--ours", "--", filePath]);
        break;
      case "theirs":
        await this.git.raw(["checkout", "--theirs", "--", filePath]);
        break;
    }
  }

  /**
   * Removes a file from the working directory.
   */
  async removeFile(filePath: string): Promise<void> {
    await this.git.rm(filePath);
  }

  /**
   * Removes a file from the staging area.
   */
  async unstageFile(file: string): Promise<void> {
    await this.git.reset(["HEAD", file]);
  }

  /**
   * Discards changes in a file.
   */
  async discardChanges(file: string): Promise<void> {
    await this.git.checkout(["--", file]);
  }

  /**
   * Discards all unstaged changes in the repository.
   */
  async discardAllChanges(): Promise<void> {
    // Discard all changes in tracked files
    await this.git.reset(ResetMode.HARD);
    // Remove all untracked files and directories
    await this.git.clean(CleanOptions.FORCE, ["-d"]);
  }

  /**
   * Cherry-picks a commit.
   */
  async cherryPick(commitHash: string): Promise<void> {
    await this.git.raw(["cherry-pick", commitHash]);
  }

  /**
   * Reverts a commit.
   */
  async revert(commitHash: string): Promise<void> {
    await this.git.raw(["revert", "--no-edit", commitHash]);
  }

  /**
   * Resets to the specified commit.
   */
  async reset(commitHash: string, mode: ResetMode): Promise<void> {
    await this.git.reset(mode, [commitHash]);
  }

  /**
   * Creates a commit with a message.
   */
  async commit(message: string, amend = false, noVerify = false): Promise<void> {
    const args = ["commit"];

    if (amend) args.push("--amend");
    if (noVerify) args.push("--no-verify");

    args.push("-m", message);

    try {
      await this.git.raw(args);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (!noVerify) {
        const confirmed = await confirmAlert({
          title: "Commit Failed",
          message: errorMessage,
          primaryAction: {
            title: "Skip Hooks",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (confirmed) {
          await this.commit(message, amend, true);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Creates a merge commit.
   */
  async commitMerge(noVerify = false): Promise<void> {
    const args = ["commit", "--no-edit"];
    if (noVerify) args.push("--no-verify");

    try {
      await this.git.raw(args);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (!noVerify) {
        const confirmed = await confirmAlert({
          title: "Merge Commit Failed",
          message: errorMessage,
          primaryAction: {
            title: "Skip Hooks",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (confirmed) {
          await this.commitMerge(true);
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Pushes changes to a specific remote.
   */
  async pushBranch(branch: Branch, remote: string, force = false): Promise<void> {
    const options = [] as string[];

    if (force) {
      options.push("--force-with-lease");
    }

    // automatically set upstream for new branch or detached branch
    if (!branch.upstream || branch.isGone) {
      options.push("--set-upstream");
    }

    try {
      await this.git.push(remote, branch?.name, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (!force) {
        const confirmed = await confirmAlert({
          title: "Push rejected",
          message: "Reason: " + errorMessage,
          primaryAction: {
            title: "Force Push",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (confirmed) {
          await this.pushBranch(branch, remote, true);
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Pulls changes.
   */
  async pull(rebase = false): Promise<void> {
    const pullArgs = ["--prune", "--tags"];
    if (rebase) {
      pullArgs.push("--rebase");
    }
    await this.git.pull(undefined, undefined, pullArgs);
  }

  /**
   * Fetches changes.
   */
  async fetch(remote?: string): Promise<void> {
    await this.git.fetch([
      remote ? remote : "--all",
      ...((await this.isShallow()) ? ["--unshallow"] : []),
      "--prune",
      "--tags",
    ]);
  }

  async isShallow(): Promise<boolean> {
    const isShallow = await this.git.raw(["rev-parse", "--is-shallow-repository"]);
    return isShallow.trim() === "true";
  }

  /**
   * Creates a stash with an optional message.
   */
  async stash(message: string, scope?: StashScope): Promise<void> {
    const args: string[] = [];

    // Handle all/staged/unstaged stash
    if (scope === "staged") {
      args.push("--staged");
    }

    if (scope === "unstaged") {
      args.push("--keep-index");
      args.push("--include-untracked");
    }

    args.push("-m", message);

    // Handle file-specific stash
    if (typeof scope === "object" && "filePath" in scope) {
      args.push("--", scope.filePath);
    }

    await this.git.stash(["push", ...args]);
  }

  /**
   * Applies a stash by index.
   */
  async applyStash(index = 0): Promise<void> {
    await this.git.stash(["apply", `stash@{${index}}`]);
  }

  /**
   * Applies and removes a stash (pop).
   */
  async popStash(index = 0): Promise<void> {
    await this.git.stash(["pop", `stash@{${index}}`]);
  }

  /**
   * Drops a stash by index.
   */
  async dropStash(index = 0): Promise<void> {
    await this.git.stash(["drop", `stash@{${index}}`]);
  }

  /**
   * Gets a list of all stashes.
   */
  async getStashes(): Promise<Stash[]> {
    // Check if stash reference exists before proceeding
    const stashPath = join(this.repoPath, ".git", "refs", "stash");
    if (!existsSync(stashPath)) return [];

    const stashList = await this.git.raw([
      "reflog",
      "show",
      "refs/stash",
      "--date=iso-strict",
      "--format='òòòòòò %H ò %ad ò %gs ò %gd ò %gN ò %gE òò'",
    ]);

    return stashList
      .trim()
      .split("\n")
      .map((rawLine) => {
        const regex =
          /^'òòòòòò (?<hash>[0-9a-f]+) ò (?<date>[^ò]+) ò (?<message>[^ò]+) ò stash@\{[^}]+\} ò (?<author>[^ò]+) ò (?<authorEmail>[^ò]+) òò'$/;
        const stash = rawLine.trim().match(regex);

        if (!stash || !stash?.groups) {
          return undefined;
        }

        return {
          message: stash.groups.message,
          hash: stash.groups.hash,
          date: new Date(stash.groups.date),
          author: stash.groups.author,
          authorEmail: stash.groups.authorEmail,
        } as Stash;
      })
      .filter((stash) => stash !== undefined);
  }

  /**
   * Renames a stash entry by index using drop -> store flow.
   * The implementation follows the technique described here:
   * - obtain the stash commit hash
   * - drop the stash reference
   * - store it back with a new message
   */
  async renameStash(index: number, stash: Stash, newMessage: string): Promise<void> {
    // Drop original stash reference
    await this.git.stash(["drop", `stash@{${index}}`]);

    // Store back with the new message
    await this.git.stash(["store", "-m", newMessage, stash.hash]);
  }

  /**
   * Creates a tag.
   */
  async createTag(tagName: string, commitHash: string, message?: string): Promise<void> {
    await this.git.raw(["tag", "-a", tagName, "-m", message || "", commitHash]);
  }

  /**
   * Renames a tag locally by creating a new tag pointing to the same object and deleting the old one.
   */
  async renameTag(oldName: string, newName: string): Promise<void> {
    // Create new tag pointing to the same object as oldName, then delete old tag
    await this.git.raw(["tag", newName, oldName]);
    await this.git.raw(["tag", "-d", oldName]);
  }

  /**
   * Checks out a tag (detached HEAD state).
   */
  async checkoutTag(tagName: string): Promise<void> {
    await this.git.checkout([`refs/tags/${tagName}`]);
  }

  /**
   * Gets the absolute path to a file.
   */
  private getAbsolutePath(relativePath: string): string {
    return join(this.repoPath, relativePath);
  }

  /**
   * Gets the diff for a file or commit.
   */
  async getDiff(options?: { file: string; commitHash?: string; status?: FileStatus["status"] }): Promise<string> {
    // If no commitHash and no status, return diff of all staged changes
    if (!options) {
      return await this.git.diff(["--staged"]);
    }

    if (options.status === "untracked") {
      const filePath = this.getAbsolutePath(options.file);
      return readFileSync(filePath, "utf-8").replace(/^/gm, "+");
    }

    const diffOptions: string[] = [];
    if (options.commitHash) {
      diffOptions.push(`${options.commitHash}^`, options.commitHash);
    } else if (options.status === "staged") {
      diffOptions.push("--staged");
    }

    diffOptions.push("--", options.file);

    const cleanGitDiff = (diff: string): string => {
      const lines = diff.split("\n");

      // Найти первую строку с @@ (начало хунка изменений)
      const firstChunkIndex = lines.findIndex((line) => line.startsWith("@@"));

      if (firstChunkIndex === -1) {
        // Если нет @@, значит нет изменений контента
        return "";
      }

      // Взять всё начиная с первой @@
      return lines.slice(firstChunkIndex).join("\n");
    };

    const diff = await this.git.diff(diffOptions);
    return cleanGitDiff(diff);
  }

  /**
   * Merges a branch into the current branch.
   */
  async mergeBranch(branchName: string, mode: MergeMode): Promise<void> {
    await this.git.merge([branchName, `--${mode}`]);
  }

  /**
   * Rebases the current branch onto the specified branch.
   */
  async rebase(targetBranch: string): Promise<void> {
    await this.git.rebase([targetBranch]);
  }

  /**
   * Aborts an ongoing rebase.
   */
  async abortRebase(): Promise<void> {
    await this.git.rebase(["--abort"]);
  }

  /**
   * Aborts an ongoing merge.
   */
  async abortMerge(): Promise<void> {
    await this.git.merge(["--abort"]);
  }

  /**
   * Continues an ongoing rebase.
   */
  async continueRebase(): Promise<void> {
    await this.git.env("GIT_EDITOR", "true").rebase(["--continue"]);
  }

  /**
   * Continues an ongoing cherry-pick.
   */
  async continueCherryPick(): Promise<void> {
    await this.git.raw(["cherry-pick", "--continue"]);
  }

  /**
   * Aborts an ongoing cherry-pick.
   */
  async abortCherryPick(): Promise<void> {
    await this.git.raw(["cherry-pick", "--abort"]);
  }

  /**
   * Continues an ongoing revert.
   */
  async continueRevert(): Promise<void> {
    await this.git.raw(["revert", "--continue"]);
  }

  /**
   * Aborts an ongoing revert.
   */
  async abortRevert(): Promise<void> {
    await this.git.raw(["revert", "--abort"]);
  }

  /**
   * Gets a list of all remotes.
   */
  async getRemotes(): Promise<{ name: string; fetchUrl: string; pushUrl: string }[]> {
    const remotes = await this.git.getRemotes(true);
    return remotes.map((remote) => ({
      name: remote.name,
      fetchUrl: remote.refs.fetch,
      pushUrl: remote.refs.push,
    }));
  }

  /**
   * Checks connectivity to a given remote using `git ls-remote`.
   */
  async checkRemoteConnectivity(remoteName: string): Promise<void> {
    await this.git.listRemote(["--heads", remoteName, "HEAD", "--quiet"]);
  }

  /**
   * Adds a new remote.
   */
  async addRemote(name: string, fetchUrl: string, pushUrl?: string): Promise<void> {
    await this.git.addRemote(name, fetchUrl);

    if (pushUrl) {
      await this.git.raw(["remote", "set-url", "--push", name, pushUrl]);
    }
  }

  async updateRemote(name: string, fetchUrl: string, pushUrl?: string, newName?: string): Promise<void> {
    await this.git.raw(["remote", "set-url", name, fetchUrl]);
    if (pushUrl) {
      await this.git.raw(["remote", "set-url", "--push", name, pushUrl]);
    }
    if (newName && newName !== name) {
      await this.git.raw(["remote", "rename", name, newName]);
    }
  }

  /**
   * Removes a remote.
   */
  async removeRemote(name: string): Promise<void> {
    await this.git.removeRemote(name);
  }

  /**
   * Gets a list of all local tags with basic metadata.
   */
  async getTags(): Promise<Tag[]> {
    const maxTagsToLoad = parseInt(getPreferenceValues<Preferences>().maxTagsToLoad);

    const raw = await this.git.raw([
      "for-each-ref",
      "refs/tags",
      "--sort=-creatordate",
      "--format=%(refname:short)|%(objectname)|%(*objectname)|%(taggerdate:iso-strict)|%(subject)|%(taggername)|%(taggeremail)",
      `--count=${maxTagsToLoad}`,
    ]);

    return raw
      .trim()
      .split("\n")
      .filter((line) => !!line.trim())
      .map((line) => {
        const [name, objectName, dereferencedObjectName, dateStr, subject, authorStr, authorEmailStr] = line.split("|");
        // For annotated tags, the object name is the tag object, and the peeled object name is the commit object
        const commitHash = (dereferencedObjectName || objectName || "").trim();
        const message = subject?.trim();
        const date = dateStr && dateStr.trim() ? new Date(dateStr.trim()) : undefined;
        const author = authorStr?.trim();
        const authorEmail = authorEmailStr?.trim().replace(/[<>]/g, "");

        return { name, commitHash, message, date, author, authorEmail } as Tag;
      });
  }

  /**
   * Deletes a tag.
   */
  async deleteTag(tagName: string): Promise<void> {
    await this.git.raw(["tag", "-d", tagName]);
  }

  /**
   * Pushes all tags to remote.
   */
  async pushTags(remote: string, force = false): Promise<void> {
    const options = [] as string[];

    options.push("--tags");
    if (force) {
      options.push("--force-with-lease");
    }

    try {
      await this.git.push(remote, undefined, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (!force) {
        const confirmed = await confirmAlert({
          title: "Push rejected",
          message: "Reason: " + errorMessage,
          primaryAction: {
            title: "Force Push",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (confirmed) {
          await this.pushTags(remote, true);
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Pushes tags to remote with optional delete flag.
   */
  async pushTag(tagName: string, remote: string, deleteTag: boolean = false): Promise<void> {
    if (deleteTag) {
      // Delete tag from remote using --delete flag
      await this.git.push(remote, tagName, ["--delete"]);
    } else {
      // Push specific tag to remote
      await this.git.push(remote, tagName);
    }
  }

  /**
   * Returns a single commit by hash with parsed metadata and changed files.
   */
  async getCommitByHash(commitHash: string): Promise<Commit | null> {
    const log = await this.git.log(["--max-count=1", "--name-status", "--decorate=full", commitHash]);

    if (!log.latest) return null;

    const commit = log.latest;
    const changedFiles = this.parseCommitChangedFiles(commit.diff!);
    const parsedRefs = this.parseCommitRefs(commit.refs);

    return {
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      message: commit.message,
      body: commit.body,
      author: commit.author_name,
      authorEmail: commit.author_email,
      date: new Date(commit.date),
      localBranches: parsedRefs.localBranches,
      remoteBranches: parsedRefs.remoteBranches,
      tags: parsedRefs.tags,
      currentBranchName: parsedRefs.currentBranchName,
      changedFiles,
    } as Commit;
  }

  /**
   * Gets the current branch name.
   */
  async getCurrentBranch(): Promise<string | null> {
    try {
      const status = await this.git.status();
      return status.current || null;
    } catch {
      return null;
    }
  }

  /**
   * Renames a local branch. If oldName is not provided, renames the current branch.
   */
  async renameBranch(newName: string, oldName: string, upstream?: { name: string; remote: string }): Promise<void> {
    await this.git.raw(["branch", "-m", oldName, newName]);

    if (upstream) {
      await this.git.push(upstream.remote, undefined, [`${newName}`, `:${upstream.name}`]);

      await this.git.branch(["--set-upstream-to", `${upstream.remote}/${newName}`, newName]);
    }
  }

  /**
   * Stage all modified files.
   */
  async stageAll(): Promise<void> {
    await this.git.add(".");
  }

  /**
   * Unstage all staged files.
   */
  async unstageAll(): Promise<void> {
    await this.git.reset(["HEAD"]);
  }

  /**
   * Returns list of tracked file paths.
   */
  async getTrackedFilePaths(): Promise<string[]> {
    return (await this.git.raw(["ls-files"])).trim().split("\n");
  }

  /**
   * Returns commit history for a specific file (follows renames).
   */
  async getFileHistory(relativePath: string): Promise<Commit[]> {
    const log = await this.git.log(["--name-status", "--decorate=full", "--follow", "--", relativePath]);

    return log.all.map(
      (commit: {
        hash: string;
        message: string;
        body: string;
        author_name: string;
        author_email: string;
        date: string;
        refs?: string;
        diff?: DiffResult;
      }) => {
        const changedFiles = this.parseCommitChangedFiles(commit.diff!);
        const parsedRefs = this.parseCommitRefs(commit.refs);

        return {
          hash: commit.hash,
          shortHash: commit.hash.substring(0, 7),
          message: commit.message,
          body: commit.body,
          author: commit.author_name,
          authorEmail: commit.author_email,
          date: new Date(commit.date),
          localBranches: parsedRefs.localBranches,
          remoteBranches: parsedRefs.remoteBranches,
          tags: parsedRefs.tags,
          currentBranchName: parsedRefs.currentBranchName,
          changedFiles,
        } as Commit;
      },
    );
  }

  /**
   * Restores a file content to the state from a given commit (kept in working tree and staged area unchanged).
   */
  async restoreFileToCommit(filePath: string, commitHash: string): Promise<void> {
    await this.git.raw(["restore", "--source", commitHash, "--", filePath]);
  }

  /**
   * Creates a unified diff patch file for changes in the working tree.
   * Returns the absolute path to the created patch file.
   */
  async createPatch(outputDirectoryPath: string, scope: PatchScope): Promise<string> {
    const status = await this.git.status();
    const untrackedFiles = status.not_added;
    const filesToTemporarilyAdd: string[] = [];

    const diffArgs = ["--binary"];

    if (typeof scope === "object" && "path" in scope) {
      if (scope.status === "staged") {
        diffArgs.push("--staged");
      }
      diffArgs.push("--", scope.absolutePath);
      if (untrackedFiles.includes(scope.absolutePath)) {
        filesToTemporarilyAdd.push(scope.absolutePath);
      }
    } else {
      switch (scope) {
        case "staged":
          diffArgs.push("--staged");
          break;
        case "unstaged":
          filesToTemporarilyAdd.push(...untrackedFiles);
          break;
        case "all":
        default:
          diffArgs.push("HEAD");
          filesToTemporarilyAdd.push(...untrackedFiles);
          break;
      }
    }

    if (filesToTemporarilyAdd.length > 0) {
      await this.git.add(["-N", ...filesToTemporarilyAdd]);
    }

    try {
      const patchContent = await this.git.diff(diffArgs);
      const currentDateString = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `${this.repoName}_${currentDateString}.patch`;
      const targetPath = join(outputDirectoryPath, fileName);
      await fs.writeFile(targetPath, patchContent, { encoding: "utf-8" });
      return targetPath;
    } finally {
      if (filesToTemporarilyAdd.length > 0) {
        await this.git.reset(["HEAD", "--", ...filesToTemporarilyAdd]);
      }
    }
  }

  /**
   * Creates a patch file for a specific commit.
   * Returns the absolute path to the created patch file.
   */
  async createPatchFromCommit(commitHash: string, outputDirectoryPath: string): Promise<string> {
    // Generate a patch using format-patch which properly includes commit metadata and binary files
    const shortHash = commitHash.substring(0, 8);
    const fileName = `${this.repoName}_commit_${shortHash}.patch`;
    const targetPath = join(outputDirectoryPath, fileName);

    // Use format-patch with -1 to create patch for a single commit
    // --binary ensures binary files are included
    // --stdout redirects output to be captured instead of written to file
    const patchContent = await this.git.raw(["format-patch", "-1", commitHash, "--binary", "--stdout"]);

    await fs.writeFile(targetPath, patchContent, { encoding: "utf-8" });
    return targetPath;
  }
  /**
   * Applies a patch file to the repository.
   * @param patchFilePath - Absolute path to the patch file
   * @throws Will throw an error if the patch cannot be applied
   */
  async applyPatch(patchFilePath: string): Promise<void> {
    if (!existsSync(patchFilePath)) {
      throw new Error(`Patch file not found: ${patchFilePath}`);
    }

    await this.git.applyPatch(patchFilePath, ["--binary", "--allow-binary-replacement", "--3way"]);
  }

  /**
   * Starts repository cloning as a detached background process using init + fetch approach.
   * Initialization (git init, add remote) is performed via simple-git; the long-running fetch
   * with progress runs in a detached bash script so the Raycast process is not blocked.
   */
  static async startCloneRepository(url: string, targetPath: string): Promise<RepositoryCloningProcess> {
    if (!existsSync(targetPath)) {
      await fs.mkdir(targetPath, { recursive: true });
    }

    // Prepare simple-git instance bound to repo directory
    const gitManager = new GitManager(targetPath);

    // Initialize repository and add remote using simple-git
    await gitManager.initRepository(url);

    // Create temp tracking directory and files outside of the repo dir
    const tempDir = await fs.mkdtemp(join(tmpdir(), "raycast-git-clone-"));
    await fs.mkdir(tempDir, { recursive: true });

    const stderrPath = join(tempDir, ".git-clone-stderr.log");
    const pidPath = join(tempDir, ".git-clone-pid.tmp");
    const exitCodePath = join(tempDir, ".git-clone-exit.tmp");
    const scriptPath = join(tempDir, ".git-clone-script.zsh");

    await fs.writeFile(stderrPath, "");
    await fs.writeFile(pidPath, "");

    // Detached bash script: fetch with progress, set default branch, checkout
    const bashScript = `#!/bin/zsh

echo $$ > "${pidPath}"
export PATH="${shellEnvironmentVariables.PATH}"
cd "${targetPath}"

# Fetch with progress (shallow to speed up initial clone)
git fetch --depth 1 --progress origin 2> "${stderrPath}"

# Set default remote HEAD
git remote set-head origin -a 2>> "${stderrPath}"

# Detect default branch name (e.g., origin/main) and extract just the branch part (e.g., main)
default_branch=$(git rev-parse --abbrev-ref origin/HEAD | sed 's|^origin/||')

if [ -n "$default_branch" ]; then
  git checkout -b "$default_branch" "origin/$default_branch" 2>> "${stderrPath}"
fi

echo $? > "${exitCodePath}"
rm -f "${scriptPath}"
`;

    await fs.writeFile(scriptPath, bashScript, { encoding: "utf-8" });
    // Set executable permissions for the script: 0o755 means rwxr-xr-x (owner can read/write/execute, group and others can read/execute)
    chmodSync(scriptPath, 0o755);

    // Run script detached so it survives the parent process
    exec(`nohup "${scriptPath}" > /dev/null 2>&1 &`, { shell: "/bin/zsh" });

    return { url, stderrPath, pidPath, exitCodePath, scriptPath };
  }

  /**
   * Initializes a repository and adds a remote.
   */
  async initRepository(url: string): Promise<void> {
    await this.git.init();
    await this.git.addRemote("origin", url);
  }

  /**
   * Gets the progress of the cloning process.
   */
  getClonningState(cloningProcess: RepositoryCloningProcess): RepositoryCloningState | undefined {
    if (!existsSync(cloningProcess.pidPath)) {
      return undefined;
    }

    const pid = parseInt(readFileSync(cloningProcess.pidPath, "utf8").trim(), 10);
    const output =
      readFileSync(cloningProcess.stderrPath, "utf8").replace(/\r/g, "\n").split("\n").filter(Boolean).pop() || "";
    const exitCode = existsSync(cloningProcess.exitCodePath)
      ? parseInt(readFileSync(cloningProcess.exitCodePath, "utf8").trim(), 10)
      : undefined;

    return {
      pid,
      output: output.trim(),
      exitCode,
    };
  }

  /**
   * Cleans up the cloning process.
   */
  cleanupCloningProcess(cloningProcess: RepositoryCloningProcess): void {
    if (existsSync(cloningProcess.stderrPath)) {
      rmSync(cloningProcess.stderrPath);
    }
    if (existsSync(cloningProcess.pidPath)) {
      rmSync(cloningProcess.pidPath);
    }
    if (existsSync(cloningProcess.exitCodePath)) {
      rmSync(cloningProcess.exitCodePath);
    }
    if (existsSync(cloningProcess.scriptPath)) {
      rmSync(cloningProcess.scriptPath);
    }
  }

  /**
   * Kills the cloning process.
   */
  async killCloningProcess(cloningProcess: RepositoryCloningProcess): Promise<void> {
    const progress = this.getClonningState(cloningProcess);
    if (!progress) return;

    // Kill the cloning process and all its children
    exec(`pkill -TERM -P ${progress.pid}; kill -TERM ${progress.pid};`);
  }
}
