import { Clipboard, Toast, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Agent } from "./agents";
import { runHeadless } from "./headless";

const execFileAsync = promisify(execFile);
const MAX_COMMITS_BYTES = 50_000;
const gitExecutable = process.platform === "win32" ? "git" : "/usr/bin/git";

const PROMPT_TEMPLATE = `Compose a pull request title and body from the following commits.

Rules:
- Title: imperative mood, under 72 characters, no trailing period.
- Body: two sections. "## What" — bullet list of user-visible changes. "## Why" — one short paragraph on motivation.
- Do not include commit shas or commit messages verbatim.
- Output EXACTLY this format, no fences or preamble:

TITLE
---
BODY

Commits:
`;

async function readGit(repoRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(
    gitExecutable,
    ["-C", repoRoot, ...args],
    {
      timeout: 15_000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  return stdout;
}

async function readGh(repoRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("gh", args, {
    cwd: repoRoot,
    timeout: 15_000,
  });
  return stdout;
}

async function resolveDefaultBranch(repoRoot: string): Promise<string> {
  try {
    const out = (
      await readGh(repoRoot, [
        "repo",
        "view",
        "--json",
        "defaultBranchRef",
        "-q",
        ".defaultBranchRef.name",
      ])
    ).trim();
    return out || "main";
  } catch {
    return "main";
  }
}

function truncate(text: string): string {
  if (Buffer.byteLength(text, "utf8") <= MAX_COMMITS_BYTES) return text;
  const slice = Buffer.from(text, "utf8")
    .slice(0, MAX_COMMITS_BYTES)
    .toString("utf8");
  return `${slice}\n\n[commits truncated at 50KB]`;
}

function splitTitleBody(response: string): { title: string; body: string } {
  const trimmed = response.trim();
  const marker = trimmed.indexOf("\n---\n");
  if (marker === -1) {
    const firstLine = trimmed.split("\n", 1)[0] || "";
    return { title: firstLine, body: trimmed };
  }
  return {
    title: trimmed.slice(0, marker).trim(),
    body: trimmed.slice(marker + 5).trim(),
  };
}

export async function runAIPRDescription(
  repoRoot: string,
  agent: Agent,
): Promise<void> {
  const defaultBranch = await resolveDefaultBranch(repoRoot);

  let current = "";
  try {
    current = (
      await readGit(repoRoot, ["symbolic-ref", "--short", "HEAD"])
    ).trim();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read current branch",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  if (current === defaultBranch) {
    await showToast({
      style: Toast.Style.Failure,
      title: "On default branch",
      message: `Switch to a feature branch first (currently on '${defaultBranch}').`,
    });
    return;
  }

  let commits = "";
  try {
    commits = await readGit(repoRoot, [
      "log",
      `${defaultBranch}..HEAD`,
      "--format=%h %s%n%b%n---",
    ]);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read commit log",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  if (!commits.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No commits ahead of default branch",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Generating PR description…",
  });

  const prompt = `${PROMPT_TEMPLATE}${truncate(commits)}`;
  const result = await runHeadless(agent, prompt, repoRoot);

  if (!result.ok) {
    await showToast({
      style: Toast.Style.Failure,
      title: result.timedOut ? "Agent timed out" : "Agent failed",
      message: result.stderr.slice(-200) || undefined,
    });
    return;
  }

  const { title, body } = splitTitleBody(result.stdout);
  await Clipboard.copy(body);
  await showToast({
    style: Toast.Style.Success,
    title: "PR body copied",
    message: title || "(no title parsed)",
  });
}
