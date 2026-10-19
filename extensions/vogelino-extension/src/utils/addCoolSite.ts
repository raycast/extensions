import { getPreferenceValues } from "@raycast/api";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { CoolSiteInsertType } from "./coolSiteTypesAndSchemas";

const DISPATCH_PAYLOAD = (values: CoolSiteInsertType) => ({
  event_type: "update-cool-site",
  client_payload: values,
});

function getGitHubCliPath(): string {
  return ["/opt/homebrew/bin/gh", "/usr/local/bin/gh"].find(existsSync) ?? "gh";
}

async function dispatchWithGitHubCli(values: CoolSiteInsertType): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      getGitHubCliPath(),
      ["api", "--method", "POST", "repos/vogelino/vogelino-portfolio/dispatches", "--input", "-"],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let errorOutput = "";

    child.stderr.on("data", (chunk: Buffer) => {
      errorOutput += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(errorOutput.trim() || `GitHub CLI exited with code ${code}`));
    });
    child.stdin.end(JSON.stringify(DISPATCH_PAYLOAD(values)));
  });
}

export async function addCoolSite(values: CoolSiteInsertType) {
  let cliError: unknown;
  try {
    await dispatchWithGitHubCli(values);
    return;
  } catch (error) {
    cliError = error;
  }

  const { githubAuthToken } = getPreferenceValues<{ githubAuthToken?: string }>();
  if (!githubAuthToken) {
    throw new Error(
      `GitHub CLI authentication failed. Run “gh auth login” in Terminal.${
        cliError instanceof Error ? ` ${cliError.message}` : ""
      }`,
    );
  }

  const response = await fetch("https://api.github.com/repos/vogelino/vogelino-portfolio/dispatches", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubAuthToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(DISPATCH_PAYLOAD(values)),
  });

  if (!response.ok) {
    const message = await response.text();
    if (response.status === 401) {
      throw new Error("GitHub rejected both saved credentials. Run “gh auth login” or replace the fallback token.");
    }
    throw new Error(message || `GitHub returned ${response.status} ${response.statusText}`);
  }
}
