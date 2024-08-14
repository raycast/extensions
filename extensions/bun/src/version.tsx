import { Action, ActionPanel, Detail } from "@raycast/api";
import { getAccessToken, showFailureToast, withAccessToken } from "@raycast/utils";

import { useEffect } from "react";
import compareLoose from "semver/functions/compare-loose";

import { authorize, getGithubApi } from "./api/github";
import { formatLoadingValue } from "./utils";
import { useLatestBunVersion, useLocalBunVersion } from "./utils/version";

const comparisonMessages = {
  0: "\u{1f389} Up to date!",
  1: "Upgrade available",
  "-1": "Local version is newer than latest",
  "-2": "Loading...",
};

function Command() {
  const client = getGithubApi(getAccessToken());

  const localVersion = useLocalBunVersion();
  const latestVersion = useLatestBunVersion(client);

  useEffect(() => {
    if (latestVersion.error) {
      showFailureToast(latestVersion.error, { title: "Error fetching latest Bun version" });
    }
  }, [latestVersion]);

  const comparison =
    !localVersion.isLoading && localVersion.data && !latestVersion.loading && latestVersion.version
      ? compareLoose(latestVersion.version, localVersion.data.version)
      : -2;

  const localChangelogUrl = `https://bun.sh/blog/bun-v${localVersion.data?.version}`;
  const latestChangelogUrl = `https://bun.sh/blog/bun-v${latestVersion.version}`;
  const localReleaseUrl = `https://github.com/oven-sh/bun/releases/tag/bun-v${localVersion.data?.version}`;
  const latestReleaseUrl = `https://github.com/oven-sh/bun/releases/tag/${latestVersion.data?.repository?.latestRelease?.tagName}`;
  const localCommitUrl = `https://github.com/oven-sh/bun/commit/${localVersion.data?.commit}`;
  const latestCommitUrl = latestVersion.tagCommit?.commitUrl;

  return (
    <Detail
      markdown={`\
${comparisonMessages[comparison]}

## Local

* Version: ${formatLoadingValue(localVersion, "version")}
* Revision: ${formatLoadingValue(localVersion, "revision")}
* [Changelog](${localChangelogUrl})
* [Release](${localReleaseUrl})
* [Commit](${localCommitUrl})

## Latest

* Version: ${formatLoadingValue(latestVersion, "version")}
* Tag: ${formatLoadingValue(latestVersion, "tagName")}
* [Changelog](${latestChangelogUrl})
* [Release](${latestReleaseUrl})
* [Commit](${latestCommitUrl})
`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {latestVersion.version && latestVersion.version != localVersion.data?.version && (
              <Action.OpenInBrowser title={`Open Changelog for ${latestVersion.version}`} url={latestChangelogUrl} />
            )}
            {localVersion.data?.version && (
              <Action.OpenInBrowser title={`Open Changelog for ${localVersion.data.version}`} url={localChangelogUrl} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken({ authorize })(Command);
