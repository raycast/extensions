import { open, closeMainWindow, popToRoot, showHUD } from "@raycast/api";
import { octokit } from "./common";
import { App } from "./config/apps";
import { ENVIRONMENTS_BY_APP } from "./config/environments";

/**
 * This regex is used to extract the current tag from a helm chart file.
 */
const REGEX = /tag: ?(.+)/;

/**
 * This regex is used to extract the version number from the tag name.
 * It assumes that the tag name is in the format "le-chat-web-X.X.X-<hash_or_rc_string>".
 */
const STRIP_NAME_REGEX = /(\d+\.\d+\.\d+.+)/;

export async function createVortexDeployment({
  tag,
  app,
  environments,
}: {
  tag: string;
  app: App;
  environments: string[];
}) {
  const owner = "mistralai";
  const repo = "vortex";
  const baseBranch = "main";
  const newBranchName = "hackathon-" + Date.now();
  const targetEnvironments = ENVIRONMENTS_BY_APP[app].filter((e) =>
    environments.includes(e.id),
  );

  if (targetEnvironments.length === 0) {
    throw new Error("File path not found");
  }

  const prTitle = `[🤖] Deploy ${tag} to ${environments
    .map((e) => `\`${e}\``)
    .join(", ")}`;

  try {
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranchName}`,
      sha: refData.object.sha,
    });

    const UPDATE_RECORD: Record<
      string,
      { previousTag: string; newTag: string }
    > = {};

    for (const environment of targetEnvironments) {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: environment.helmChart,
        ref: baseBranch,
      });

      if (!("content" in fileData)) {
        throw new Error("File content not found");
      }

      const content = Buffer.from(fileData.content, "base64").toString();

      const _tag = STRIP_NAME_REGEX.exec(tag)?.[1];

      const updatedContent = content.replace(REGEX, `tag: ${_tag}`);
      const previousTag = content.match(REGEX)?.[1];

      UPDATE_RECORD[environment.id] = {
        previousTag: previousTag ?? "",
        newTag: _tag ?? "",
      };

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: environment.helmChart,
        message: `Update ${app} in ${environment.id} from ${previousTag} to ${tag}`,
        content: Buffer.from(updatedContent).toString("base64"),
        branch: newBranchName,
        sha: fileData.sha,
      });
    }

    const { data: prData } = await octokit.pulls.create({
      owner,
      repo,
      title: prTitle,
      head: newBranchName,
      base: baseBranch,
      body: `This is an automated PR to deploy ${tag} to ${environments.join(", ")}.\n\n**Tags updated:**\n\n
\`\`\`
${Object.entries(UPDATE_RECORD)
  .map(([key, value]) => `${key}: ${value.previousTag} -> ${value.newTag}`)
  .join("\n")}
\`\`\`
      `,
    });

    // await octokit.pulls.merge({
    //   owner,
    //   repo,
    //   pull_number: prData.number,
    //   merge_method: "squash",
    // });

    if (prData) {
      await showHUD(`✅ PR created to ${prData.url}`);
      open(prData.html_url);
      await popToRoot();
      await closeMainWindow();
    }
  } catch (error) {
    console.error(error);
  }
}
