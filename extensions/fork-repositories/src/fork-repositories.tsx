import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { homedir } from "os";
import { dirname } from "path";
import tildify from "./vendor/tildify";
import { useRepos, useHasApplication } from "./hooks";

export const FORK_BUNDLE_ID = "com.DanPristupov.Fork";
export const REPO_FILE_PATH = `${homedir()}/Library/Application Support/${FORK_BUNDLE_ID}/repositories.json`;

const ForkNotFound = () => {
  return (
    <Detail
      navigationTitle="Fork.app not found"
      markdown={`
  # Fork.app not found 

  You need to have Fork to use this extension. You can download it [here](https://fork.dev/), or alternatively using
  [Homebrew](https://brew.sh/):
  \`\`\`
  brew install --cask fork
  \`\`\`
      `}
    />
  );
};

const Command = () => {
  const [hasFork, isHasForkLoading] = useHasApplication(FORK_BUNDLE_ID);
  const [repos, isReposLoading] = useRepos(REPO_FILE_PATH);

  const isLoading = isHasForkLoading || isReposLoading;

  if (!isLoading && !hasFork) {
    return <ForkNotFound />;
  }

  if (!isLoading && repos.length === 0) {
    return <Detail markdown="Couldn't find any repositories." />;
  }

  return (
    <List searchBarPlaceholder="Search repositories…" isLoading={isLoading}>
      <List.Section title={`${repos.length} ${repos.length === 1 ? "Repository" : "Repositories"}`}>
        {repos.map((repo, index) => {
          const { path, name } = repo;
          return (
            <List.Item
              key={index}
              title={name}
              accessoryTitle={dirname(tildify(path))}
              icon={{ fileIcon: path }}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Open title="Open in Fork" icon="icon.png" target={path} application={FORK_BUNDLE_ID} />
                    <Action.OpenWith path={path} />
                    <Action.ShowInFinder path={path} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
};

export default Command;
