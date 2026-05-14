import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const upstreamOwner = "raycast";
const upstreamRepo = "extensions";
const forkRepo = "raycast-extensions";
const token = process.env.RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC;
const options = parseArgs(process.argv.slice(2));

if (!token) {
  throw new Error("RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC is required.");
}

if (!options.source) {
  throw new Error("Usage: node scripts/publish-raycast-pr.mjs --source <release-source> [--release-tag vX.Y.Z]");
}

const sourceRoot = path.resolve(options.source);
const releaseTag = options.releaseTag;
const packageJson = await readJson(path.join(sourceRoot, "package.json"));
const extensionName = packageJson.name;

if (typeof extensionName !== "string" || extensionName.length === 0) {
  throw new Error("package.json name must be a non-empty string.");
}

const branch = `ext/${extensionName}`;
const authUser = await getAuthenticatedUser();
const fork = await ensureFork(authUser.login);
const workRoot = path.join(
  process.env.RUNNER_TEMP ?? path.join(process.cwd(), "local-verification"),
  "raycast-publish-pr",
);
const cloneRoot = path.join(workRoot, "raycast-extensions");
const targetExtensionPath = path.join(cloneRoot, "extensions", extensionName);
const existingPullRequest = await findOpenPullRequest(authUser.login, branch);

await fs.rm(workRoot, { recursive: true, force: true });
await fs.mkdir(workRoot, { recursive: true });

await runGit([
  "clone",
  "--filter=blob:none",
  "--no-checkout",
  authenticatedGitUrl(authUser.login, fork.name),
  cloneRoot,
]);

await runGit(["remote", "add", "upstream", `https://github.com/${upstreamOwner}/${upstreamRepo}.git`], {
  cwd: cloneRoot,
});
await runGit(["fetch", "--depth=1", "upstream", "main"], { cwd: cloneRoot });
await runGit(["checkout", "-B", branch, "upstream/main"], { cwd: cloneRoot });

await runGit(["config", "user.name", authUser.login], { cwd: cloneRoot });
await runGit(["config", "user.email", `${authUser.id}+${authUser.login}@users.noreply.github.com`], {
  cwd: cloneRoot,
});

await fs.rm(targetExtensionPath, { recursive: true, force: true });
await copyTrackedExtensionFiles(sourceRoot, targetExtensionPath);

await runGit(["add", `extensions/${extensionName}`], { cwd: cloneRoot });

const hasChanges = await hasGitChanges(cloneRoot);

if (!hasChanges) {
  if (existingPullRequest) {
    console.log(`Raycast Pull Request already up to date: ${existingPullRequest.html_url}`);
    process.exit(0);
  }

  throw new Error("No extension changes were found and no open Raycast Pull Request exists.");
}

const commitTitle = existingPullRequest ? `Update ${extensionName} extension` : `Add ${extensionName} extension`;
const commitMessage = releaseTag ? `${commitTitle}\n\nRelease tag: ${releaseTag}` : commitTitle;

await runGit(["commit", "-m", commitMessage], { cwd: cloneRoot });

const remoteBranchSha = await getRemoteBranchSha(cloneRoot, branch);
const pushArgs = remoteBranchSha
  ? ["push", `--force-with-lease=refs/heads/${branch}:${remoteBranchSha}`, "origin", `HEAD:refs/heads/${branch}`]
  : ["push", "origin", `HEAD:refs/heads/${branch}`];

await runGit(pushArgs, { cwd: cloneRoot });

const updatedPullRequest = await findOpenPullRequest(authUser.login, branch);

if (updatedPullRequest) {
  console.log(`Updated Raycast Pull Request: ${updatedPullRequest.html_url}`);
  process.exit(0);
}

const createdPullRequest = await createPullRequest(authUser.login, branch, extensionName);
console.log(`Created Raycast Pull Request: ${createdPullRequest.html_url}`);

function parseArgs(args) {
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--source") {
      parsed.source = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--release-tag") {
      parsed.releaseTag = args[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

async function getAuthenticatedUser() {
  const user = await githubApi("/user");

  if (typeof user.login !== "string" || typeof user.id !== "number") {
    throw new Error("GitHub token did not return a valid authenticated user.");
  }

  return user;
}

async function ensureFork(owner) {
  const existingFork = await getRepository(owner, forkRepo);

  if (existingFork) {
    return existingFork;
  }

  await githubApi(`/repos/${upstreamOwner}/${upstreamRepo}/forks`, {
    method: "POST",
    body: {
      name: forkRepo,
      default_branch_only: true,
    },
  });

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await wait(2000);
    const fork = await getRepository(owner, forkRepo);

    if (fork) {
      return fork;
    }
  }

  throw new Error(`GitHub fork was not ready: ${owner}/${forkRepo}`);
}

async function getRepository(owner, repo) {
  try {
    return await githubApi(`/repos/${owner}/${repo}`);
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return undefined;
    }

    throw error;
  }
}

async function findOpenPullRequest(owner, headBranch) {
  const pullRequests = await githubApi(
    `/repos/${upstreamOwner}/${upstreamRepo}/pulls?state=open&base=main&head=${owner}:${encodeURIComponent(headBranch)}`,
  );

  const matchingPullRequests = pullRequests.filter(
    (pullRequest) => pullRequest.head?.ref === headBranch && pullRequest.head?.user?.login === owner,
  );

  if (matchingPullRequests.length > 1) {
    throw new Error(`Multiple open Raycast Pull Requests found for ${owner}:${headBranch}.`);
  }

  return matchingPullRequests[0];
}

async function createPullRequest(owner, headBranch, name) {
  return githubApi(`/repos/${upstreamOwner}/${upstreamRepo}/pulls`, {
    method: "POST",
    body: {
      title: `Add ${name} extension`,
      head: `${owner}:${headBranch}`,
      base: "main",
      maintainer_can_modify: true,
      draft: true,
      body: createPullRequestBody(),
    },
  });
}

function createPullRequestBody() {
  return [
    "## Description",
    "",
    "Add Prompt Launcher, a Raycast extension for finding Markdown prompt files and copying or opening them quickly.",
    "",
    "## Screencast",
    "",
    "<!-- Add screenshots or a screencast before marking this Pull Request ready for review. -->",
    "",
    "## Checklist",
    "",
    "- [ ] I read the extension guidelines",
    "- [ ] I read the documentation about publishing",
    "- [ ] I ran `npm run build` and tested this distribution build in Raycast",
    "- [ ] I checked that files in the `assets` folder are used by the extension itself",
    "- [ ] I checked that assets used by the `README` are placed outside of the `metadata` folder",
  ].join("\n");
}

async function copyTrackedExtensionFiles(source, target) {
  const { stdout } = await runGit(["-C", source, "ls-files", "-z"]);
  const files = stdout.split("\0").filter(Boolean).filter(isPublishFile);

  await fs.mkdir(target, { recursive: true });

  for (const file of files) {
    const sourceFile = path.join(source, file);
    const targetFile = path.join(target, file);
    const stat = await fs.stat(sourceFile);

    if (!stat.isFile()) {
      continue;
    }

    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.copyFile(sourceFile, targetFile, fsConstants.COPYFILE_FICLONE);
  }
}

function isPublishFile(file) {
  return !file.startsWith(".github/") && file !== "raycast-env.d.ts";
}

async function hasGitChanges(cwd) {
  const { stdout } = await runGit(["status", "--porcelain"], { cwd });
  return stdout.trim().length > 0;
}

async function getRemoteBranchSha(cwd, headBranch) {
  const { stdout } = await runGit(["ls-remote", "origin", `refs/heads/${headBranch}`], { cwd });
  const [sha] = stdout.trim().split(/\s+/);
  return sha || undefined;
}

function authenticatedGitUrl(owner, repo) {
  return `https://oauth2:${encodeURIComponent(token)}@github.com/${owner}/${repo}.git`;
}

async function githubApi(endpoint, options = {}) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.text());
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json();
}

async function runGit(args, options = {}) {
  try {
    return await execFileAsync("git", args, {
      cwd: options.cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const output = [error.message, error.stdout, error.stderr].filter(Boolean).join("\n");
    throw new Error(sanitize(output));
  }
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

function sanitize(value) {
  return token ? value.replaceAll(token, "***") : value;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

class GitHubApiError extends Error {
  constructor(status, message) {
    super(`GitHub API request failed with ${status}: ${message}`);
    this.status = status;
  }
}
