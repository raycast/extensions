import { createHash } from "node:crypto";

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";
import { pluralize } from "../helpers";
import { getFileStatusAccessory, PullRequestFile, truncatePatch } from "../helpers/pull-request";

import { PullRequest } from "./PullRequestActions";

const FILES_PER_PAGE = 100;
const MIN_FENCE_LENGTH = 4;

type PullRequestDiffProps = {
  pullRequest: PullRequest;
};

export default function PullRequestDiff({ pullRequest }: PullRequestDiffProps) {
  const { octokit } = getGitHubClient();

  const { data, isLoading, pagination } = useCachedPromise(
    (owner: string, repo: string, pullRequestNumber: number) =>
      async ({ page }: { page: number }) => {
        const { data } = await octokit.pulls.listFiles({
          owner,
          repo,
          pull_number: pullRequestNumber,
          per_page: FILES_PER_PAGE,
          page: page + 1,
        });

        return { data, hasMore: data.length === FILES_PER_PAGE };
      },
    [pullRequest.repository.owner.login, pullRequest.repository.name, pullRequest.number],
    {
      async onError(error) {
        await showFailureToast(error, { title: "Failed loading changed files" });
      },
    },
  );

  const files = data ?? [];
  const sectionSubtitle =
    "additions" in pullRequest && "deletions" in pullRequest
      ? `+${pullRequest.additions} −${pullRequest.deletions}`
      : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isLoading || files.length > 0}
      pagination={pagination}
      navigationTitle={`#${pullRequest.number} Diff`}
    >
      <List.Section title={pluralize(files.length, "file", { withNumber: true })} subtitle={sectionSubtitle}>
        {files.map((file) => {
          const status = getFileStatusAccessory(file.status);

          return (
            <List.Item
              key={file.sha + file.filename}
              title={file.filename}
              icon={{ value: status.icon, tooltip: status.tooltip }}
              subtitle={
                file.previous_filename
                  ? { value: file.previous_filename, tooltip: `${file.previous_filename} → ${file.filename}` }
                  : undefined
              }
              accessories={[
                { text: { value: `+${file.additions}`, color: Color.Green } },
                { text: { value: `−${file.deletions}`, color: Color.Red } },
              ]}
              detail={<List.Item.Detail markdown={getPatchMarkdown(file)} />}
              actions={
                <ActionPanel title={file.filename}>
                  <Action.OpenInBrowser
                    title="Open File Diff in Browser"
                    url={`${pullRequest.permalink}/files#diff-${getFileAnchor(file.filename)}`}
                  />
                  <Action.OpenInBrowser title="Open Diff in Browser" url={`${pullRequest.permalink}/files`} />

                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      content={file.filename}
                      title="Copy File Path"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                    />

                    {file.patch ? (
                      <Action.CopyToClipboard
                        content={file.patch}
                        title="Copy Patch"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                      />
                    ) : null}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.EmptyView
        icon={Icon.CodeBlock}
        title="No changed files"
        description="This pull request does not change any files."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Diff in Browser" url={`${pullRequest.permalink}/files`} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function getPatchMarkdown(file: PullRequestFile) {
  if (!file.patch) {
    return "_No text diff available (binary or too large). Open on GitHub to view._";
  }

  const { patch, remainingLines } = truncatePatch(file.patch);
  const fence = getFence(patch);
  const fencedPatch = `${fence}diff\n${patch}\n${fence}`;

  if (remainingLines === 0) {
    return fencedPatch;
  }

  return `${fencedPatch}\n\n_… truncated, ${pluralize(remainingLines, "more line", {
    withNumber: true,
  })}. Open the file on GitHub for the full diff._`;
}

// A fence only holds when it is longer than every backtick run inside it, and diffs of Markdown
// files routinely carry fences of their own.
function getFence(patch: string) {
  let longestRun = 0;

  for (const [backticks] of patch.matchAll(/`+/g)) {
    longestRun = Math.max(longestRun, backticks.length);
  }

  return "`".repeat(Math.max(MIN_FENCE_LENGTH, longestRun + 1));
}

// GitHub anchors each file on the pull request files page by the SHA-256 digest of its path.
function getFileAnchor(filename: string) {
  return createHash("sha256").update(filename).digest("hex");
}
