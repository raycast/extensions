import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { execSync } from "child_process";
import React, { useState, useEffect } from "react";

interface GitHubAccount {
  username: string;
  hostname: string;
  isActive: boolean;
}

export default function SwitchGitHubAccount() {
  const [accounts, setAccounts] = useState<GitHubAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
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

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Find GitHub CLI
      const ghPath = findGitHubCLI();

      // Get all GitHub accounts
      const output = execSync(`${ghPath} auth status`, {
        encoding: "utf8",
        stdio: "pipe",
      }).toString();
      const lines = output.split("\n");

      const accountsList: GitHubAccount[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("Logged in to") && line.includes("account")) {
          const match = line.match(/Logged in to ([^\s]+) account ([^\s]+)/);
          if (match) {
            const hostname = match[1];
            const username = match[2];

            // Check if the next line indicates this is the active account
            const isActive =
              i + 1 < lines.length &&
              lines[i + 1].includes("Active account: true");

            accountsList.push({
              username,
              hostname,
              isActive,
            });
          }
        }
      }

      setAccounts(accountsList);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Command failed")) {
        setError(
          "GitHub CLI (gh) is not installed. Please install it first: brew install gh",
        );
      } else {
        setError(
          "Failed to load GitHub accounts. Please ensure you have authenticated accounts.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearGitHubCredentials = async (): Promise<void> => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Clearing cached credentials...",
      });

      // Clear keychain credentials
      try {
        while (true) {
          execSync("security find-internet-password -s github.com", {
            stdio: "ignore",
          });
          execSync("security delete-internet-password -s github.com", {
            stdio: "ignore",
          });
        }
      } catch {
        // No more credentials to delete
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Cleared cached credentials",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to clear credentials",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const configureGitAuth = async (): Promise<void> => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Configuring git authentication...",
      });

      execSync(
        'git config --global credential.https://github.com.helper "!gh auth git-credential"',
        { stdio: "ignore" },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Git configured to use GitHub CLI",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to configure git",
        message: err instanceof Error ? err.message : "Unknown error",
      });
      throw err;
    }
  };

  const switchToAccount = async (username: string) => {
    const confirmed = await confirmAlert({
      title: "Switch GitHub Account",
      message: `Are you sure you want to switch to ${username}?`,
      primaryAction: {
        title: "Switch",
        style: Alert.ActionStyle.Default,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (!confirmed) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Switching account...",
      });

      // Clear cached credentials
      await clearGitHubCredentials();

      // Configure git auth
      await configureGitAuth();

      // Switch account
      const ghPath = findGitHubCLI();
      execSync(`${ghPath} auth switch --user ${username}`, { stdio: "ignore" });

      // Verify the switch
      const output = execSync(`${ghPath} auth status`, {
        encoding: "utf8",
        stdio: "pipe",
      }).toString();

      // Look for the account with "Active account: true" and extract the username
      const lines = output.split("\n");
      let activeAccount = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("Logged in to") && line.includes("account")) {
          // Extract username from line like "  ✓ Logged in to github.com account theempathai (keyring)"
          const match = line.match(/account ([^\s]+)/);
          if (match) {
            // Check if the next line indicates this is the active account
            if (
              i + 1 < lines.length &&
              lines[i + 1].includes("Active account: true")
            ) {
              activeAccount = match[1];
              break;
            }
          }
        }
      }

      if (activeAccount === username) {
        await showToast({
          style: Toast.Style.Success,
          title: "Account switched successfully",
          message: `Now using ${username}`,
        });

        // Reload accounts to update the list
        await loadAccounts();
      } else {
        throw new Error("Account switch verification failed");
      }
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch account",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon="❌"
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadAccounts} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {accounts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon="👤"
          title="No GitHub accounts found"
          description="Please authenticate with GitHub CLI first: gh auth login"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={loadAccounts} />
            </ActionPanel>
          }
        />
      ) : (
        accounts.map((account) => (
          <List.Item
            key={account.username}
            icon={account.isActive ? "✅" : "👤"}
            title={account.username}
            subtitle={account.hostname}
            accessories={[{ text: account.isActive ? "Active" : "" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Switch to Account"
                  onAction={() => switchToAccount(account.username)}
                  icon="🔀"
                />
                <Action
                  title="Refresh"
                  onAction={loadAccounts}
                  icon="🔄"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
