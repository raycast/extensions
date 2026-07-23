import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useState } from "react";
import { addConnectedGitHubAccount } from "./lib/commit-sounds";
import { authorizeGitHubAccount, GitHubProfile } from "./lib/github-oauth";

type ConnectGitHubAccountProps = {
  onConnected?: () => Promise<void> | void;
};

export function ConnectGitHubAccount({
  onConnected,
}: ConnectGitHubAccountProps = {}) {
  const [slot] = useState(() => `account-${randomUUID()}`);
  const [profile, setProfile] = useState<GitHubProfile>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>();

  async function connect() {
    setIsConnecting(true);
    setError(undefined);
    try {
      const result = await authorizeGitHubAccount(slot);
      await addConnectedGitHubAccount(result.login, slot);
      await onConnected?.();
      setProfile(result);
      await showToast({
        style: Toast.Style.Success,
        title: `Connected ${result.login}`,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setIsConnecting(false);
    }
  }

  if (profile) {
    return (
      <Detail
        markdown={`# GitHub account connected\n\n**${profile.login}** was added to Commit Sounds and is now the default owner for new sound rules. You can connect another account or change the default from **Commit Sound Controls**.`}
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

  return (
    <Detail
      isLoading={isConnecting}
      markdown={
        error
          ? `# Could not connect GitHub\n\n${error}`
          : "# Connect another GitHub account\n\nThis saves a separate secure Raycast OAuth session. It does not affect your existing sound rules. If GitHub opens the wrong identity, switch accounts in the browser first, then continue."
      }
      actions={
        <ActionPanel>
          <Action
            title="Continue with GitHub"
            icon={Icon.PersonAdd}
            onAction={() => void connect()}
          />
          <Action.OpenInBrowser
            title="Switch GitHub Account in Browser"
            url="https://github.com/login"
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}

export default ConnectGitHubAccount;
