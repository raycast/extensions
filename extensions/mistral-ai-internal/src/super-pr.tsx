import {
  Detail,
  Form,
  ActionPanel,
  Action,
  getPreferenceValues,
} from "@raycast/api";
import { useState } from "react";
import { Octokit } from "@octokit/rest";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Mistral } from "@mistralai/mistralai";

import {
  REPO_OWNER,
  REPO_NAME,
  REPO_PATH_FOLDERS,
  MISTRAL_API_KEY,
} from "./super_pr/constants";
import slackService, { SlackBlock } from "./service/slack";

interface Preferences {
  githubToken: string;
  dashboardRepoPath: string;
  mistralApiKey: string;
}

interface ReleaseDetails {
  lastVersion?: string;
  newVersion?: string;
  changelog?: string;
  status?: string;
  error?: string;
  prDetails?: PRDetail[];
  prNumber?: number;
  prUrl?: string;
  commitAuthors?: CommitAuthor[];
  changelogSummary?: string;
}

interface CommitAuthor {
  email: string;
  name: string;
  slackHandle?: string;
}

interface FormValues {
  repoPath: string;
  token: string;
  slackChannelId?: string;
}

interface PRDetail {
  prId: string;
  author: string;
  commits: string[];
  migrations: string;
  envChanges: string;
}

interface VersionBumpDetails {
  lastVersion: string;
  newVersion: string;
  lastBumpCommit: string;
  changelog: string;
  branchName: string;
  commitAuthors: CommitAuthor[];
}

const queryClient = new QueryClient();

async function summarizeChangelog(changelog: string): Promise<string> {
  try {
    const client = new Mistral({ apiKey: MISTRAL_API_KEY });

    const prompt = `Please analyze the following changelog and provide a summary of any breaking changes,
    new environment variables, or database migrations that might be required:

    ${changelog}

    Focus only on changes that require action from users or developers.`;

    const chatResponse = await client.chat.complete({
      model: "mistral-large-latest",
      messages: [{ role: "user", content: prompt }],
    });

    const content = chatResponse.choices?.[0]?.message?.content;
    return typeof content === "string"
      ? content
      : "Failed to generate changelog summary.";
  } catch (error) {
    console.error("Error summarizing changelog:", error);
    return "Failed to generate changelog summary.";
  }
}

async function bumpVersion(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoPath: string,
): Promise<VersionBumpDetails> {
  // Get the current package.json content
  const { data: packageJsonData } = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path: `${repoPath}/package.json`,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!("content" in packageJsonData)) {
    throw new Error("Failed to get package.json content");
  }

  const packageJson = JSON.parse(
    Buffer.from(packageJsonData.content, "base64").toString(),
  );
  const lastVersion = packageJson.version;

  // Get the last commit where version was bumped
  const { data: commits } = await octokit.search.commits({
    q: `repo:${owner}/${repo} path:${repoPath}/package.json "version": "${lastVersion}"`,
    sort: "committer-date",
    order: "desc",
  });

  const lastBumpCommit = commits.items[0]?.sha;

  // Get commits since last bump for changelog
  const { data: recentCommits } = await octokit.repos.listCommits({
    owner,
    repo,
    sha: "main",
    since: lastBumpCommit,
    path: repoPath,
  });

  const changelog = recentCommits
    .map((commit) => `- ${commit.commit.message} (${commit.sha.slice(0, 7)})`)
    .join("\n");

  // Extract unique commit authors
  const commitAuthors: CommitAuthor[] = [];
  recentCommits.forEach((commit) => {
    if (commit.commit.author && commit.commit.author.email) {
      const existingAuthor = commitAuthors.find(
        (a) => a.email === commit.commit.author?.email,
      );
      if (!existingAuthor) {
        commitAuthors.push({
          email: commit.commit.author.email,
          name: commit.commit.author.name || "",
        });
      }
    }
  });

  // Calculate new version
  const [major, minor, patch] = lastVersion.split(".").map(Number);
  const newVersion = `${major}.${minor}.${patch + 1}`;
  const branchName = `release/${repoPath.split("/").pop()}/${newVersion}`;

  // Create new branch
  const { data: mainRef } = await octokit.git.getRef({
    owner,
    repo,
    ref: "heads/main",
  });

  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: mainRef.object.sha,
  });

  // Update package.json
  const updatedPackageJson = { ...packageJson, version: newVersion };
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: `${repoPath}/package.json`,
    message: `chore(release): Bump ${repoPath.split("/").pop()} to version ${newVersion}`,
    content: Buffer.from(JSON.stringify(updatedPackageJson, null, 2)).toString(
      "base64",
    ),
    branch: branchName,
    sha: packageJsonData.sha,
  });

  // Update CHANGELOG.md
  const { data: changelogData } = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path: `${repoPath}/CHANGELOG.md`,
      ref: "main",
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!("content" in changelogData)) {
    throw new Error("Failed to get CHANGELOG.md content");
  }

  const currentChangelog = Buffer.from(
    changelogData.content,
    "base64",
  ).toString();
  const newChangelog = `## ${newVersion}\n\n${changelog}\n\n${currentChangelog}`;

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: `${repoPath}/CHANGELOG.md`,
    message: `docs: Update changelog for version ${newVersion}`,
    content: Buffer.from(newChangelog).toString("base64"),
    branch: branchName,
    sha: changelogData.sha,
  });

  return {
    lastVersion,
    newVersion,
    lastBumpCommit,
    changelog,
    branchName,
    commitAuthors,
  };
}

async function sendSlackNotification(
  channelId: string,
  releaseDetails: ReleaseDetails,
) {
  if (
    !releaseDetails.commitAuthors ||
    releaseDetails.commitAuthors.length === 0
  ) {
    return { success: false, error: "No commit authors found" };
  }

  // Create Slack blocks for rich formatting
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `New Release: ${releaseDetails.newVersion}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Previous version: ${releaseDetails.lastVersion}\nPR: ${releaseDetails.prUrl}`,
      },
    },
  ];

  // Add changelog summary if available
  if (releaseDetails.changelogSummary) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Breaking Changes Summary:*\n${releaseDetails.changelogSummary}`,
      },
    });
  }

  // Add contributors section
  const contributorNames = releaseDetails.commitAuthors
    .map((author) => author.name)
    .filter(Boolean)
    .join(", ");

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Contributors:* ${contributorNames}`,
    },
  });

  // Plain text fallback
  const textFallback =
    `*New Release: ${releaseDetails.newVersion}*\n\n` +
    `Previous version: ${releaseDetails.lastVersion}\n` +
    `PR: ${releaseDetails.prUrl}\n\n` +
    (releaseDetails.changelogSummary
      ? `*Breaking Changes Summary:*\n${releaseDetails.changelogSummary}\n\n`
      : "") +
    `*Contributors:* ${contributorNames}`;

  return await slackService.sendRichMessage(channelId, blocks, textFallback);
}

function SuperPRContent() {
  const preferences = getPreferenceValues<Preferences>();
  const [releaseDetails, setReleaseDetails] = useState<ReleaseDetails>({});
  const [formValues, setFormValues] = useState<FormValues>({
    repoPath: preferences.dashboardRepoPath,
    token: preferences.githubToken || "",
    slackChannelId: "",
  });
  const [shouldProcess, setShouldProcess] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["releaseProcess", formValues],
    queryFn: async () => {
      if (!shouldProcess || !formValues.repoPath) {
        return null;
      }

      try {
        setReleaseDetails({ status: "Starting version bump process..." });

        const octokit = new Octokit({ auth: preferences.githubToken });
        const versionDetails = await bumpVersion(
          octokit,
          REPO_OWNER,
          REPO_NAME,
          formValues.repoPath,
        );

        setReleaseDetails((prev) => ({
          ...prev,
          lastVersion: versionDetails.lastVersion,
          newVersion: versionDetails.newVersion,
          changelog: versionDetails.changelog,
          status: "Analyzing changelog for breaking changes...",
          prUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/compare/${encodeURIComponent(versionDetails.branchName)}?expand=1`,
          commitAuthors: versionDetails.commitAuthors,
        }));

        // Generate changelog summary using Mistral AI
        const changelogSummary = await summarizeChangelog(
          versionDetails.changelog,
        );

        const releaseInfo = {
          lastVersion: versionDetails.lastVersion,
          newVersion: versionDetails.newVersion,
          changelog: versionDetails.changelog,
          status: "Version bump completed successfully!",
          prUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/compare/${encodeURIComponent(versionDetails.branchName)}?expand=1`,
          commitAuthors: versionDetails.commitAuthors,
          changelogSummary,
        };

        setReleaseDetails((prev) => ({
          ...prev,
          ...releaseInfo,
        }));

        // Send Slack notification if channel ID is provided
        if (formValues.slackChannelId) {
          setReleaseDetails((prev) => ({
            ...prev,
            status: "Sending Slack notification...",
          }));

          const slackResult = await sendSlackNotification(
            formValues.slackChannelId,
            releaseInfo,
          );

          if (slackResult.success) {
            setReleaseDetails((prev) => ({
              ...prev,
              status:
                "Version bump and Slack notification completed successfully!",
            }));
          } else {
            setReleaseDetails((prev) => ({
              ...prev,
              status: "Version bump completed, but Slack notification failed.",
              error: slackResult.error,
            }));
          }
        }

        return versionDetails;
      } catch (error) {
        setReleaseDetails((prev) => ({
          ...prev,
          error: String(error),
        }));
        return null;
      }
    },
    enabled: shouldProcess,
  });

  function startReleaseProcess(values: FormValues) {
    setFormValues(values);
    setShouldProcess(true);
  }

  function renderPRDetails() {
    if (!releaseDetails.prDetails) return "No PR details available";

    return releaseDetails.prDetails
      .map(
        (pr) =>
          `### PR #${pr.prId} by ${pr.author}\n**Commits:**\n${pr.commits.map((c) => `- ${c}`).join("\n")}\n\n${
            pr.migrations ? `**Migrations:**${pr.migrations}\n\n` : ""
          }${
            pr.envChanges ? `**Environment Changes:**${pr.envChanges}\n\n` : ""
          }`,
      )
      .join("\n\n");
  }

  function renderContributors() {
    if (
      !releaseDetails.commitAuthors ||
      releaseDetails.commitAuthors.length === 0
    ) {
      return "No contributors information available";
    }

    return releaseDetails.commitAuthors
      .map((author) => `- ${author.name}`)
      .join("\n");
  }

  return (
    <>
      {!releaseDetails.newVersion ? (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title="Start Release Process"
                onSubmit={startReleaseProcess}
              />
            </ActionPanel>
          }
          isLoading={isLoading}
        >
          <Form.Dropdown
            id="repoPath"
            title="Repository Path"
            value={formValues.repoPath}
            onChange={(value) =>
              setFormValues((prev) => ({ ...prev, repoPath: value }))
            }
          >
            {Object.values(REPO_PATH_FOLDERS).map((option) => (
              <Form.Dropdown.Item key={option} value={option} title={option} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="slackChannelId"
            title="Slack Channel ID (optional)"
            placeholder="C12345678"
            info="Channel ID to notify contributors about the release"
            value="C08MS99H6KA"
            onChange={(value) =>
              setFormValues((prev) => ({ ...prev, slackChannelId: value }))
            }
          />
          {releaseDetails.error && (
            <Form.Description text={`Error: ${releaseDetails.error}`} />
          )}
          {releaseDetails.status && (
            <Form.Description text={releaseDetails.status} />
          )}
        </Form>
      ) : (
        <Detail
          markdown={`# Release Details\n\n**New Version:** ${releaseDetails.newVersion}\n\n## Pull Request\n**PR #${releaseDetails.prNumber}:** [View on GitHub](${releaseDetails.prUrl})\n\n${releaseDetails.changelogSummary ? `## Breaking Changes Summary\n${releaseDetails.changelogSummary}\n\n` : ""}## Contributors\n${renderContributors()}\n\n## PR Details\n${renderPRDetails()}`}
          actions={
            <ActionPanel>
              <Action
                title="Start Another Release"
                onAction={() => setReleaseDetails({})}
              />
              {releaseDetails.prUrl && (
                <Action.OpenInBrowser
                  url={releaseDetails.prUrl}
                  title="Open Pr in Browser"
                />
              )}
            </ActionPanel>
          }
        />
      )}
    </>
  );
}

export default function Command() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuperPRContent />
    </QueryClientProvider>
  );
}
