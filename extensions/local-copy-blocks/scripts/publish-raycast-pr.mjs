import { execFile, spawn } from "node:child_process";
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
const workRoot = path.join(
  process.env.RUNNER_TEMP ?? path.join(process.cwd(), "local-verification"),
  "raycast-publish-pr",
);
const cloneRoot = path.join(workRoot, "raycast-extensions");
const targetExtensionPath = path.join(cloneRoot, "extensions", extensionName);
const existingPullRequest = await findOpenPullRequest(authUser.login, branch);

if (!existingPullRequest) {
  console.log(`No open Raycast Pull Request found for ${authUser.login}:${branch}.`);
  console.log("Running the official Raycast publish command to create the initial Pull Request.");
  await publishWithRaycastCommand(sourceRoot, authUser);
  process.exit(0);
}

const forkOwner = existingPullRequest.head?.repo?.owner?.login ?? authUser.login;
const forkName = existingPullRequest.head?.repo?.name ?? forkRepo;

console.log(`Updating existing Raycast Pull Request: ${existingPullRequest.html_url}`);

await fs.rm(workRoot, { recursive: true, force: true });
await fs.mkdir(workRoot, { recursive: true });

console.log(`Cloning ${forkOwner}/${forkName} with sparse checkout.`);
await runGitStreaming([
  "clone",
  "--depth=1",
  "--filter=tree:0",
  "--sparse",
  "--no-checkout",
  authenticatedGitUrl(forkOwner, forkName),
  cloneRoot,
]);
console.log("Clone completed.");

await runGit(["remote", "add", "upstream", `https://github.com/${upstreamOwner}/${upstreamRepo}.git`], {
  cwd: cloneRoot,
});
console.log(`Preparing ${branch} from ${upstreamOwner}/${upstreamRepo}:main.`);
await runGitStreaming(["fetch", "--depth=1", "--filter=tree:0", "upstream", "main"], { cwd: cloneRoot });
console.log("Fetch completed.");
await runGitStreaming(["sparse-checkout", "set", "--no-cone", `extensions/${extensionName}`], { cwd: cloneRoot });
console.log("Sparse checkout configured.");
await runGitStreaming(["checkout", "-B", branch, "upstream/main"], { cwd: cloneRoot });
console.log(`Checked out ${branch} from upstream/main.`);

await runGit(["config", "user.name", authUser.login], { cwd: cloneRoot });
await runGit(["config", "user.email", `${authUser.id}+${authUser.login}@users.noreply.github.com`], {
  cwd: cloneRoot,
});

await fs.rm(targetExtensionPath, { recursive: true, force: true });
console.log(`Copying release source into extensions/${extensionName}.`);
await copyTrackedExtensionFiles(sourceRoot, targetExtensionPath);

await runGit(["add", `extensions/${extensionName}`], { cwd: cloneRoot });

const hasChanges = await hasGitChanges(cloneRoot);

if (!hasChanges) {
  console.log(`Raycast Pull Request already up to date: ${existingPullRequest.html_url}`);
  process.exit(0);
}

const commitTitle = `Update ${extensionName} extension`;
const commitMessage = releaseTag ? `${commitTitle}\n\nRelease tag: ${releaseTag}` : commitTitle;

await runGit(["commit", "-m", commitMessage], { cwd: cloneRoot });

const remoteBranchSha = await getRemoteBranchSha(cloneRoot, branch);
const pushArgs = remoteBranchSha
  ? ["push", `--force-with-lease=refs/heads/${branch}:${remoteBranchSha}`, "origin", `HEAD:refs/heads/${branch}`]
  : ["push", "origin", `HEAD:refs/heads/${branch}`];

console.log(`Pushing ${branch} to ${forkOwner}/${forkName}.`);
await runGitStreaming(pushArgs, { cwd: cloneRoot });
console.log("Push completed.");

const updatedPullRequest = await findOpenPullRequest(authUser.login, branch);

if (updatedPullRequest) {
  console.log(`Updated Raycast Pull Request: ${updatedPullRequest.html_url}`);
  process.exit(0);
}

throw new Error(`Expected open Raycast Pull Request was not found after updating ${authUser.login}:${branch}.`);

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

async function publishWithRaycastCommand(cwd, user) {
  await runGit(["config", "user.name", user.login], { cwd });
  await runGit(["config", "user.email", `${user.id}+${user.login}@users.noreply.github.com`], { cwd });

  await runCommand("npm", ["ci"], { cwd });
  await runCommand("npm", ["run", "publish"], {
    cwd,
    env: {
      GITHUB_ACCESS_TOKEN: token,
      RAYCAST_PUBLISH_GITHUB_TOKEN_CLASSIC: token,
    },
  });
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

async function runGitStreaming(args, options = {}) {
  return runCommand("git", args, options);
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      const text = sanitize(data.toString());
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (data) => {
      const text = sanitize(data.toString());
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(sanitize(`${command} ${args.join(" ")} failed with exit code ${code}\n${stderr}`)));
    });
  });
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

function sanitize(value) {
  return token ? value.replaceAll(token, "***") : value;
}

class GitHubApiError extends Error {
  constructor(status, message) {
    super(`GitHub API request failed with ${status}: ${message}`);
    this.status = status;
  }
}
