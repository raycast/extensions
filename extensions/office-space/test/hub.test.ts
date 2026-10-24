// Runs the extension's library code against a live Office Space helper:
//   TEST_HUB=/path/to/hub npm run test:hub
// Needs git. Creates its own fixtures in a temp folder.
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareVersions, hub, hubPath } from "../src/lib/hub";
import {
  branchFor,
  briefFor,
  fetchPullRequest,
  findClone,
  isIssueURL,
  promptFor,
  remoteMatches,
} from "../src/lib/issues";
import { Agent, CaptureResult, Summary, TailOutput } from "../src/lib/types";

function git(cwd: string, ...args: string[]) {
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, stdio: "pipe" });
}

async function main() {
  assert(compareVersions("0.2.0", "0.10.0") < 0);
  assert(compareVersions("v0.2.0", "0.2.0") === 0);
  assert(compareVersions("0.2.0-beta.2", "0.2.0") < 0);
  assert(compareVersions("0.3.1", "0.2.9") > 0);

  const temp = mkdtempSync(join(tmpdir(), "officespace-ext-"));
  console.log("hub:", hubPath());

  // A hosted bot that echoes what it's sent.
  const bot = join(temp, "bot.sh");
  writeFileSync(bot, 'echo ready\nwhile IFS= read -r line; do echo "got: $line"; done\n');
  const agent = await hub<Agent>(["launch", `sh ${bot}`, "--dir", temp, "--name", "Extension Test Bot"]);
  assert.equal(agent.status, "working");

  const summary = await hub<Summary>(["summary"]);
  assert(summary.line.length > 0);
  assert((await hub<Agent[]>(["agents"])).some((a) => a.id === agent.id));

  // Errors become rejections carrying hub's message.
  await assert.rejects(hub(["send", "no-such-agent-xyz", "hi"]), /No agent matches/);

  // Capture: large text over stdin plus a selection argument.
  const result = await hub<CaptureResult>(
    [
      "capture",
      "--to",
      agent.id,
      "--url",
      "http://localhost:9/x",
      "--title",
      "Page",
      "--stdin",
      "content",
      "--selection",
      "sel",
      "--note",
      "look at this",
      "--source",
      "raycast",
    ],
    { input: "# Big page\n\nhello" },
  );
  assert.equal(result.delivery, "typed");
  await new Promise((resolve) => setTimeout(resolve, 800));
  const tail = await hub<TailOutput>(["tail", agent.id, "-n", "10"]);
  assert(
    tail.lines.some((line) => line.includes("got: look at this")),
    tail.lines.join("\n"),
  );

  // Issue and PR helpers.
  assert(isIssueURL("https://github.com/kocheck/office-space/pull/1"));
  assert(isIssueURL("https://linear.app/acme/issue/ENG-42/fix-nav"));
  assert(!isIssueURL("https://github.com/kocheck/office-space"));
  const pr = {
    kind: "github-pr" as const,
    url: "u",
    key: "#5",
    title: "Fix the nav on mobile!",
    body: "",
    repo: "acme/widgets",
    number: 5,
    headBranch: "fix/nav",
    fromFork: false,
  };
  assert.equal(branchFor(pr), "fix/nav");
  assert.equal(branchFor({ ...pr, fromFork: true }), "pr-5-fix-the-nav-on-mobile");
  assert.equal(branchFor({ ...pr, kind: "github-issue" }), "agent/5-fix-the-nav-on-mobile");
  assert.equal(
    branchFor({ kind: "linear", url: "u", key: "ENG-42", title: "X", body: "", suggestedBranch: "kyle/eng-42-x" }),
    "kyle/eng-42-x",
  );
  assert(briefFor(pr).startsWith("Pull request #5: Fix the nav on mobile!"));
  assert(promptFor(pr).includes("gh pr view 5"));
  assert(remoteMatches("git@github.com:Acme/Widgets.git", "acme/widgets"));
  assert(!remoteMatches("git@github.com:notacme/widgets.git", "acme/widgets"));
  assert(!remoteMatches("https://github.com/acme/widgets-old", "acme/widgets"));

  // A clone whose origin is acme/widgets (really a local bare repo with a PR ref).
  const origin = join(temp, "origin.git");
  execFileSync("git", ["init", "-q", "--bare", origin]);
  const clone = join(temp, "code", "widgets");
  execFileSync("git", ["init", "-q", "-b", "main", clone]);
  writeFileSync(join(clone, "a"), "a");
  git(clone, "add", "a");
  git(clone, "commit", "-qm", "init");
  git(clone, "remote", "add", "origin", origin);
  git(clone, "push", "-q", "origin", "main");
  git(clone, "checkout", "-q", "-b", "pr");
  writeFileSync(join(clone, "b"), "b");
  git(clone, "add", "b");
  git(clone, "commit", "-qm", "pr");
  git(clone, "push", "-q", "origin", "pr:refs/pull/5/head");
  git(clone, "checkout", "-q", "main");
  git(clone, "branch", "-q", "-D", "pr");
  git(clone, "remote", "set-url", "origin", "git@github.com:acme/widgets.git");
  git(clone, "config", `url.${origin}.insteadOf`, "git@github.com:acme/widgets.git");

  assert.equal(await findClone([temp, clone], "acme/widgets"), clone);
  await fetchPullRequest(clone, pr, "fix/nav");
  const prAgent = await hub<Agent>([
    "launch",
    `sh ${bot}`,
    "--dir",
    clone,
    "--worktree",
    "fix/nav",
    "--name",
    "Extension Test PR",
  ]);
  assert.equal(prAgent.project?.branch, "fix/nav");
  execFileSync("test", ["-f", join(prAgent.worktreePath ?? "", "b")]); // the PR's code is checked out

  for (const id of [agent.id, prAgent.id]) await hub(["stop-agent", id]);
  console.log("extension hub tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
