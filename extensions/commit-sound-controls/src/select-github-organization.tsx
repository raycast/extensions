import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { AccountForm } from "./account-form";
import {
  CommitSoundAccount,
  ConnectedGitHubAccount,
} from "./lib/commit-sounds";
import {
  GitHubOrganization,
  listGitHubOrganizations,
} from "./lib/github-oauth";

type SelectGitHubOrganizationProps = {
  connectedAccounts: ConnectedGitHubAccount[];
  soundRules: CommitSoundAccount[];
  onSaved: (account: CommitSoundAccount) => Promise<void>;
};

export function SelectGitHubOrganization({
  connectedAccounts,
  soundRules,
  onSaved,
}: SelectGitHubOrganizationProps) {
  const [organizations, setOrganizations] = useState<GitHubOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const results = await Promise.all(
          connectedAccounts.map((account) =>
            listGitHubOrganizations(account.tokenSlot),
          ),
        );
        if (cancelled) return;

        const uniqueOrganizations = new Map<string, GitHubOrganization>();
        results.flat().forEach((organization) => {
          uniqueOrganizations.set(
            organization.login.toLowerCase(),
            organization,
          );
        });
        setOrganizations(
          [...uniqueOrganizations.values()].sort((left, right) =>
            left.login.localeCompare(right.login),
          ),
        );
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [connectedAccounts]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Choose GitHub Organization"
      searchBarPlaceholder="Search your GitHub organizations"
    >
      {organizations.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Building}
          title={
            error ? "Could not load organizations" : "No organizations found"
          }
          description={
            error
              ? `${error} Disconnect and connect the GitHub account again to grant organization access, or add the organization manually.`
              : "Connect the GitHub account that belongs to the organization, or add its GitHub owner name manually."
          }
        />
      ) : (
        <List.Section title="Organizations available to connected accounts">
          {organizations.map((organization) => {
            const soundRule = soundRules.find(
              (rule) =>
                rule.owner.toLowerCase() === organization.login.toLowerCase(),
            );
            return (
              <List.Item
                key={organization.login}
                icon={{
                  source: organization.avatarUrl,
                  fallback: Icon.Building,
                }}
                title={organization.login}
                accessories={soundRule ? [{ text: "Sound configured" }] : []}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={
                        soundRule
                          ? "Edit Organization Sound"
                          : "Add Organization Sound"
                      }
                      icon={soundRule ? Icon.Pencil : Icon.PlusCircle}
                      target={
                        <AccountForm
                          account={soundRule}
                          defaultOwner={organization.login}
                          title="Add Organization Sound"
                          onSaved={onSaved}
                        />
                      }
                    />
                    <Action.OpenInBrowser
                      title="Open Organization on GitHub"
                      icon={Icon.Globe}
                      url={organization.htmlUrl}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
