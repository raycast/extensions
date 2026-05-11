import * as React from "react";
import { readdir } from "node:fs/promises";
import { useLaunchCommands, useContainingDirectories } from "./configApi";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { Action, ActionPanel, Icon, List, open, useNavigation } from "@raycast/api";
import path from "node:path";
import { promisify } from "node:util";
import { exec as _exec } from "node:child_process";
import { SettingsView } from "./Settings/SettingsView";

const exec = promisify(_exec);

export default function Command() {
  const containingDirectories = useContainingDirectories();
  const navigation = useNavigation();

  const { isLoading, data, revalidate } = useCachedPromise(
    async () => {
      const proms = containingDirectories.map((dir) =>
        readdir(dir, { withFileTypes: true }).then((els) =>
          els
            .filter((dirent) => dirent.isDirectory())
            .map<ProjectItem>((dirent) => ({
              name: dirent.name,
              parentDir: dir,
            })),
        ),
      );

      return Promise.all(proms).then((res) => res.flat());
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  // Revalidate if we find ourselves in a state where we have containing directory but no projects.
  // This will occur e.g. when setting up a containing directory for the first time and coming
  //  back to the list view.
  React.useEffect(() => {
    if (containingDirectories.length > 0 && !isLoading && data.length === 0) {
      revalidate();
    }
  }, [containingDirectories, isLoading, data.length, revalidate]);

  return (
    <List isLoading={isLoading}>
      {data.map((item) => (
        <List.Item
          title={item.name}
          subtitle={item.parentDir}
          key={`${item.parentDir}/${item.name}`}
          actions={<ProjectActions item={item} />}
        />
      ))}
      <List.EmptyView
        title="No projects found"
        description="Configure a Containing Directory from the extension settings."
        actions={
          <ActionPanel title="Configure extension">
            <Action title="Open Settings" icon={Icon.Gear} onAction={() => navigation.push(<SettingsView />)} />
          </ActionPanel>
        }
      />
    </List>
  );
}

type ProjectItem = {
  name: string;
  parentDir: string;
};

function ProjectActions({ item }: { item: ProjectItem }) {
  const launchCommands = useLaunchCommands();
  const { data: repoUrl } = useCachedPromise(getRepoUrl, [getProjectDir(item)], {
    keepPreviousData: true,
    initialData: "",
  });

  const getGitHubUrl = (path: string) => `${repoUrl}${path}`;

  return (
    <ActionPanel title={item.name}>
      <ActionPanel.Section title="User Actions">
        {launchCommands.map((cmd) => (
          <Action
            title={`Open with ${cmd.title}`}
            key={cmd.title}
            icon={getAvatarIcon(cmd.title)}
            onAction={() => {
              if (cmd.command.startsWith("bundleId:")) {
                open(getProjectDir(item), cmd.command.split("bundleId:")[1]);
                return;
              }

              exec(cmd.command, { cwd: getProjectDir(item) });
            }}
          />
        ))}
      </ActionPanel.Section>

      {repoUrl && (
        <ActionPanel.Section title="GitHub.com Actions">
          <Action.OpenInBrowser title="Repo Site" url={getGitHubUrl("/")} />
          <Action.OpenInBrowser title="Issues" url={getGitHubUrl("/issues")} />
          <Action.OpenInBrowser title="Pull Requests" url={getGitHubUrl("/pulls")} />
          <Action.OpenInBrowser title="Commits" url={getGitHubUrl("/commits")} />
          <Action.OpenInBrowser title="Actions" url={getGitHubUrl("/actions")} />
          <Action.OpenInBrowser title="Compare Branches" url={getGitHubUrl("/compare")} />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section title="Mac Actions">
        <Action.ShowInFinder title="Show in Finder" path={getProjectDir(item)} />
        <Action.CopyToClipboard title="Copy Path to Clipboard" content={getProjectDir(item)} />
        <Action.OpenWith path={path.join(item.parentDir, item.name)} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

const getProjectDir = (item: ProjectItem) => path.join(item.parentDir, item.name);

async function getRepoUrl(dir: string) {
  try {
    const repoUrl = (await exec(`git config --get remote.origin.url`, { cwd: dir })).stdout.replace(/\n/g, "");

    let remoteHttpsUrl = "";
    if (repoUrl.startsWith("https")) {
      remoteHttpsUrl = repoUrl.replace(/\.git$/g, "");
    } else {
      const r = /^git@(.*):(.*)\/(.*)\.git$/;
      const match = repoUrl.match(r);
      if (match) {
        const [, base, org, repo] = match;

        if (base !== "github.com") return "";

        remoteHttpsUrl = `https://${base}/${org}/${repo}`;
      }
    }

    return remoteHttpsUrl;
  } catch {
    return "";
  }
}
