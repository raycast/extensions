import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Octokit } from "@octokit/rest";
import { getPreferences } from "./preferences";

interface Tag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  zipball_url: string;
  tarball_url: string;
  node_id: string;
}

export default function Command() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { githubToken, owner, repo } = getPreferences();

  useEffect(() => {
    async function fetchTags() {
      try {
        const octokit = new Octokit({ auth: githubToken });

        const res = await octokit.paginate("GET /repos/{owner}/{repo}/tags", {
          owner,
          repo,
          per_page: 100,
        });

        setTags(res);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch tags",
          message: String(error),
        });
        setIsLoading(false);
      }
    }

    fetchTags();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tags...">
      {tags.map((tag) => (
        <List.Item
          key={tag.node_id}
          title={tag.name}
          subtitle={`Commit: ${tag.commit.sha.substring(0, 7)}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Tag Name"
                content={tag.name}
              />
              <Action.OpenInBrowser
                title="View on GitHub"
                url={`https://github.com/${owner}/${repo}/releases/tag/${tag.name}`}
              />
              <Action.CopyToClipboard
                title="Copy Commit Sha"
                content={tag.commit.sha}
              />
              <Action.OpenInBrowser
                title="View Commit"
                url={`https://github.com/${owner}/${repo}/commit/${tag.commit.sha}`}
              />
              <Action.OpenInBrowser
                title="Download Zip"
                url={tag.zipball_url}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
