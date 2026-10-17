import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const RELEASE_NOTES_URL = "https://api.github.com/repos/wpbones/WPBones/releases/latest";
const RELEASES_PAGE = "https://github.com/wpbones/WPBones/releases";

interface GithubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

export default function Command() {
  const { data, error, isLoading } = useFetch<GithubRelease>(RELEASE_NOTES_URL, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });

  let markdown: string;
  if (error) {
    markdown = `#### Failed to load release notes\n\n${error.message}\n\nThis may be due to GitHub API rate limiting. [View releases on GitHub](${RELEASES_PAGE}).`;
  } else if (data) {
    markdown = `#### ${data.name || data.tag_name}\n\n*Released: ${new Date(data.published_at).toLocaleDateString()}*\n\n---\n\n${data.body}`;
  } else {
    markdown = "Loading release notes...";
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View on GitHub" url={data?.html_url ?? RELEASES_PAGE} icon={Icon.Globe} />
          {data && <Action.CopyToClipboard title="Copy Release Notes" content={data.body} />}
        </ActionPanel>
      }
    />
  );
}
