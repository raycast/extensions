import { ActionPanel, Detail, List, Action, open } from "@raycast/api";
import { dirname } from "node:path";
import tildify from "./vendor/tildify";
import { useRepos, useHasApplication } from "./hooks";
import { FORK_BUNDLE_ID, REPO_FILE_PATH } from "./constants";

const Command = () => {
  const [hasFork, isHasForkLoading] = useHasApplication(FORK_BUNDLE_ID);
  const [repos, isReposLoading] = useRepos(REPO_FILE_PATH);
  const isLoading = isHasForkLoading || isReposLoading;

  if (!isLoading && !hasFork) {
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
  }

  if (!isLoading && repos.length === 0) {
    return <Detail markdown="Couldn't find any repositories." />;
  }

  return (
    <List searchBarPlaceholder="Search repositories…" isLoading={isLoading} filtering={{ keepSectionOrder: true }}>
      {Object.entries(
        repos.reduce((acc: { [dir: string]: Repo[] }, repo) => {
          const dir = dirname(repo.path);
          if (!(dir in acc)) {
            acc[dir] = [];
          }
          acc[dir].push(repo);
          return acc;
        }, {})
      ).map(([dir, repos]) => (
        <List.Section
          key={dir}
          title={tildify(dir)}
          subtitle={`${repos.length} ${repos.length === 1 ? "Repository" : "Repositories"}`}
        >
          {repos.map((repo) => {
            const { path, name } = repo;
            return (
              <List.Item
                key={path}
                title={name}
                icon={{ fileIcon: path }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Open in Fork"
                        icon="icon.png"
                        onAction={async () => {
                          // For some reason, if this action is used when Fork isn't running, it'll result in
                          // the app being started, but not the repo actually being opened.
                          // So to work around that, we call `open` twice 🤷
                          await open(path, FORK_BUNDLE_ID);
                          await open(path, FORK_BUNDLE_ID);
                        }}
                      />
                      <Action.OpenWith path={path} />
                      <Action.ShowInFinder path={path} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
                accessories={[{ tag: dirname(tildify(path)) }]}
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
};

export default Command;
