import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const packageJsonPath = path.join(repoRoot, "package.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function getRaycastUsername() {
  const override = process.env.RAYCAST_AUTHOR?.trim();
  if (override) return override;

  const out = execFileSync("npx", ["ray", "profile", "--json"], {
    encoding: "utf8",
  });
  const profile = JSON.parse(out);

  // Raycast CLI output shape can vary by version. Support common variants.
  // Examples seen:
  // - { "username": "foo" }
  // - { "data": { "username": "foo" } }
  // - { "user": { "username": "foo" } }
  // - { "Username": "foo" }
  const usernameCandidates = [
    profile?.username,
    profile?.Username,
    profile?.data?.username,
    profile?.data?.Username,
    profile?.user?.username,
    profile?.user?.Username,
    profile?.profile?.username,
    profile?.profile?.Username,
    profile?.handle,
    profile?.Handle,
    profile?.user?.handle,
    profile?.user?.Handle,
  ];

  const username = usernameCandidates.find(
    (v) => typeof v === "string" && v.trim().length > 0,
  );
  if (!username || typeof username !== "string") {
    throw new Error(
      "Could not read username from `npx ray profile --json` output. " +
        "Try running `npx ray profile --json` manually, or set RAYCAST_AUTHOR to your Raycast username.",
    );
  }
  return username.trim();
}

const pkg = readJson(packageJsonPath);
const username = getRaycastUsername();

pkg.author = username;

writeJson(packageJsonPath, pkg);
console.log(`Set package.json author to '${username}'`);
