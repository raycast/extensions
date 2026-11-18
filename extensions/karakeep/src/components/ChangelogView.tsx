import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useTranslation } from "../hooks/useTranslation";
import { formatReleaseNotes, releaseTagFromImage } from "../utils/release";

const RELEASES_API = "https://api.github.com/repos/karakeep-app/karakeep/releases";
const RELEASES_PAGE = "https://github.com/karakeep-app/karakeep/releases";

interface GitHubRelease {
  tag_name?: string;
  name?: string;
  html_url?: string;
  published_at?: string;
  body?: string;
}

export function ChangelogView({ image }: { image?: string }) {
  const { t } = useTranslation();
  const tag = releaseTagFromImage(image);
  const url = tag ? `${RELEASES_API}/tags/${encodeURIComponent(tag)}` : `${RELEASES_API}/latest`;

  const { data, isLoading, error } = useFetch<GitHubRelease>(url, {
    headers: { Accept: "application/vnd.github+json" },
    keepPreviousData: true,
    // Render the failure in the body instead. useFetch's default is a toast,
    // which would sit on top of a screen that is already explaining itself —
    // and its message ("Failed to fetch") names the symptom, not the cause
    // (offline, or GitHub's 60-request hourly limit for unauthenticated calls).
    onError: () => {},
  });

  const releaseUrl = data?.html_url ?? (tag ? `${RELEASES_PAGE}/tag/${tag}` : RELEASES_PAGE);

  const markdown = error
    ? `# ${t("changelog.title")}\n\n${t("changelog.error", { message: error.message })}`
    : data
      ? formatReleaseNotes(data.body, data.name || data.tag_name || t("changelog.title"), t("changelog.empty"))
      : `# ${t("changelog.title")}\n\n${t("changelog.loading")}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={t("changelog.title")}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title={t("changelog.version")} text={data.tag_name ?? "—"} />
            {data.published_at && (
              <Detail.Metadata.Label
                title={t("changelog.released")}
                text={new Date(data.published_at).toLocaleDateString()}
              />
            )}
            <Detail.Metadata.Link
              title={t("changelog.onGitHub")}
              target={releaseUrl}
              text={t("changelog.viewOnline")}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={releaseUrl} title={t("changelog.actions.openRelease")} icon={Icon.Globe} />
          <Action.OpenInBrowser url={RELEASES_PAGE} title={t("changelog.actions.allReleases")} icon={Icon.List} />
          {data?.body && (
            <Action.CopyToClipboard content={data.body} title={t("changelog.actions.copy")} icon={Icon.Clipboard} />
          )}
        </ActionPanel>
      }
    />
  );
}
