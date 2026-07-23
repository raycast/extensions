import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { getAccessToken, OAuthService, withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import { setConnectedGitHubAccount } from "./lib/commit-sounds";

const github = OAuthService.github({ scope: "read:user" });

type GitHubProfile = {
  login: string;
  html_url: string;
};

function ConnectGitHubAccount() {
  const { token } = getAccessToken();
  const [profile, setProfile] = useState<GitHubProfile>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function connect() {
      try {
        const response = await fetch("https://api.github.com/user", {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });
        if (!response.ok)
          throw new Error(`GitHub returned ${response.status}.`);
        const result = (await response.json()) as GitHubProfile;
        await setConnectedGitHubAccount(result.login);
        setProfile(result);
        await showToast({
          style: Toast.Style.Success,
          title: `Connected ${result.login}`,
        });
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
      }
    }
    void connect();
  }, [token]);

  if (error) {
    return <Detail markdown={`# Could not connect GitHub\n\n${error}`} />;
  }

  if (!profile) {
    return <Detail isLoading markdown="Connecting your GitHub account…" />;
  }

  return (
    <Detail
      markdown={`# GitHub connected\n\n**${profile.login}** is now available as the default GitHub owner when you add a commit sound rule.`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open GitHub Profile"
            url={profile.html_url}
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(github)(ConnectGitHubAccount);
