import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { expandPath, loadEnvFile } from "./env";
import { FastlaneLane, FastlaneProject } from "./types";

export type PreflightResult = {
  warnings: string[];
  errors: string[];
};

function commandExists(command: string) {
  try {
    execFileSync("/usr/bin/env", ["which", command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function runPreflight(
  project: FastlaneProject,
  lane: FastlaneLane,
): PreflightResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!fs.existsSync(project.rootPath))
    errors.push(`Project root not found: ${project.rootPath}`);
  if (!fs.existsSync(project.workingDirectory))
    errors.push(`Working directory not found: ${project.workingDirectory}`);
  if (project.envFilePath && !fs.existsSync(expandPath(project.envFilePath)))
    errors.push(`Env file not found: ${project.envFilePath}`);
  try {
    const env = { ...process.env, ...loadEnvFile(project.envFilePath) };
    for (const key of lane.requiredEnvVars || []) {
      if (!env[key]) errors.push(`Required env var missing: ${key}`);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  if (
    !fs.existsSync(path.join(project.workingDirectory, "fastlane", "Fastfile"))
  )
    warnings.push("No fastlane/Fastfile found in working directory");
  if (lane.command.includes("bundle") && !commandExists("bundle"))
    errors.push("Bundler not found. Install it with: gem install bundler");
  if (
    !lane.command.includes("bundle") &&
    lane.command.includes("fastlane") &&
    !commandExists("fastlane")
  )
    errors.push("Fastlane not found. Install it with: gem install fastlane");

  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: project.rootPath,
      encoding: "utf8",
    }).trim();
    if (lane.expectedBranch && branch !== lane.expectedBranch)
      warnings.push(
        `Expected branch ${lane.expectedBranch}, current branch is ${branch}`,
      );
    if (lane.isProduction && !lane.expectedBranch && branch !== "main")
      warnings.push(`Production deployment from ${branch}, not main`);
    const status = execFileSync("git", ["status", "--short"], {
      cwd: project.rootPath,
      encoding: "utf8",
    }).trim();
    if (status) warnings.push("Project has uncommitted changes");
  } catch {
    warnings.push("Git status could not be checked");
  }

  return { warnings, errors };
}
