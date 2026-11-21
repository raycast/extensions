import { Alert, Clipboard, Toast, confirmAlert, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Agent } from "./agents";
import { runHeadless } from "./headless";

const execFileAsync = promisify(execFile);
const MAX_DIFF_BYTES = 50_000;
const gitExecutable = process.platform === "win32" ? "git" : "/usr/bin/git";

const PROMPT_TEMPLATE = `Write a git commit message for the following diff.

Requirements:
- Use Conventional Commits format: <type>(<scope>): <subject>.
- Subject line max 72 characters, imperative mood.
- Then a blank line, then a body wrapped at 72 characters explaining WHY, not WHAT.
- Output ONLY the commit message. No code fences, no preamble, no explanation.

Diff:
`;

async function readDiff(repoRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(
    gitExecutable,
    ["-C", repoRoot, ...args],
    {
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  return stdout;
}

function truncate(diff: string): string {
  if (Buffer.byteLength(diff, "utf8") <= MAX_DIFF_BYTES) return diff;
  const slice = Buffer.from(diff, "utf8")
    .slice(0, MAX_DIFF_BYTES)
    .toString("utf8");
  return `${slice}\n\n[diff truncated at 50KB]`;
}

export async function runAICommit(
  repoRoot: string,
  agent: Agent,
): Promise<void> {
  let diff = "";
  try {
    diff = await readDiff(repoRoot, ["diff", "--cached"]);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read staged diff",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  if (!diff.trim()) {
    const useUnstaged = await confirmAlert({
      title: "No staged changes",
      message: "Use the unstaged diff (git diff HEAD) instead?",
      primaryAction: {
        title: "Use Unstaged",
        style: Alert.ActionStyle.Default,
      },
    });
    if (!useUnstaged) return;
    try {
      diff = await readDiff(repoRoot, ["diff", "HEAD"]);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read diff",
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }

  if (!diff.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No changes to summarize",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Generating commit message…",
  });

  const prompt = `${PROMPT_TEMPLATE}${truncate(diff)}`;
  const result = await runHeadless(agent, prompt, repoRoot);

  if (!result.ok) {
    await showToast({
      style: Toast.Style.Failure,
      title: result.timedOut ? "Agent timed out" : "Agent failed",
      message: result.stderr.slice(-200) || undefined,
    });
    return;
  }

  const message = result.stdout.trim();
  await Clipboard.copy(message);
  await showToast({
    style: Toast.Style.Success,
    title: "Commit message copied",
    message: message.split("\n")[0],
  });
}
