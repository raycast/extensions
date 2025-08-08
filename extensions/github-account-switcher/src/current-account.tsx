import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  showToast,
  Toast,
} from "@raycast/api";
import { execSync } from "child_process";
import React, { useState, useEffect } from "react";

interface AccountInfo {
  username: string;
  hostname: string;
  scopes: string[];
  gitProtocol: string;
}

export default function CurrentGitHubAccount() {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentAccount();
  }, []);

  const findGitHubCLI = (): string => {
    const possiblePaths = [
      "/opt/homebrew/bin/gh",
      "/usr/local/bin/gh",
      "/usr/bin/gh",
    ];

    for (const path of possiblePaths) {
      try {
        execSync(`test -f ${path}`, { stdio: "ignore" });
        return path;
      } catch {
        continue;
      }
    }

    throw new Error(
      "GitHub CLI (gh) is not installed. Please install it first: brew install gh",
    );
  };

  const loadCurrentAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Find GitHub CLI
      const ghPath = findGitHubCLI();

      // Get current account status
      const output = execSync(`${ghPath} auth status`, {
        encoding: "utf8",
        stdio: "pipe",
      }).toString();
      const lines = output.split("\n");

      let username = "";
      let hostname = "";
      let scopes: string[] = [];
      let gitProtocol = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes("Logged in to") && line.includes("account")) {
          // Check if the next line indicates this is the active account
          if (
            i + 1 < lines.length &&
            lines[i + 1].includes("Active account: true")
          ) {
            const match = line.match(/Logged in to ([^\s]+) account ([^\s]+)/);
            if (match) {
              hostname = match[1];
              username = match[2];
            }
          }
        } else if (line.includes("Token scopes:")) {
          const scopesMatch = line.match(/Token scopes: (.+)/);
          if (scopesMatch) {
            scopes = scopesMatch[1].split(", ");
          }
        } else if (line.includes("Git operations protocol:")) {
          const protocolMatch = line.match(/Git operations protocol: (.+)/);
          if (protocolMatch) {
            gitProtocol = protocolMatch[1];
          }
        }
      }

      if (!username) {
        throw new Error("No active GitHub account found");
      }

      setAccountInfo({
        username,
        hostname,
        scopes,
        gitProtocol,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Command failed")) {
        setError(
          "GitHub CLI (gh) is not installed. Please install it first: brew install gh",
        );
      } else {
        setError(
          "No active GitHub account found. Please authenticate with: gh auth login",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyUsername = async () => {
    if (accountInfo) {
      try {
        await Clipboard.copy(accountInfo.username);
        await showToast({
          style: Toast.Style.Success,
          title: "Username copied to clipboard",
          message: accountInfo.username,
        });
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to copy username",
        });
      }
    }
  };

  const testGitAuth = async () => {
    if (!accountInfo) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Testing git authentication...",
      });

      const ghPath = findGitHubCLI();
      const testCommand = `echo "protocol=https
host=github.com
username=${accountInfo.username}" | ${ghPath} auth git-credential get`;

      execSync(testCommand, { stdio: "ignore" });

      await showToast({
        style: Toast.Style.Success,
        title: "Git authentication working",
        message: "You can use git commands with this account",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Git authentication failed",
        message: "Please run: gh auth refresh",
      });
    }
  };

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={loadCurrentAccount} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <Detail isLoading={true} markdown="Loading current GitHub account..." />
    );
  }

  if (!accountInfo) {
    return (
      <Detail
        markdown="# 👤 No Active Account\n\nNo active GitHub account found. Please authenticate with GitHub CLI first."
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={loadCurrentAccount} />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `# 👤 Current GitHub Account

## Account Details
- **Username**: ${accountInfo.username}
- **Hostname**: ${accountInfo.hostname}
- **Git Protocol**: ${accountInfo.gitProtocol || "Not configured"}

## Token Scopes
${
  accountInfo.scopes.length > 0
    ? accountInfo.scopes.map((scope) => `- ${scope}`).join("\n")
    : "No scopes available"
}

## Quick Actions
Use the actions below to copy your username or test git authentication.
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Copy Username"
            onAction={copyUsername}
            icon="📋"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Test Git Authentication"
            onAction={testGitAuth}
            icon="🧪"
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          <Action
            title="Refresh"
            onAction={loadCurrentAccount}
            icon="🔄"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
