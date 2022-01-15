import { ActionPanel, Detail, List, OpenAction, OpenWithAction, ShowInFinderAction } from "@raycast/api";
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
  const [isLoading, hasFork] = useHasApplication(FORK_BUNDLE_ID);
  const repos = useRepos(REPO_FILE_PATH);

  if (!isLoading && !hasFork) {
    return <ForkNotFound />;
  }

  if (!isLoading && repos.length === 0) {
    return <Detail markdown="Couldn't find any repositories." />;
  }

  return (
    <List searchBarPlaceholder="Search repositories…" isLoading={isLoading}>
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
                  <OpenAction title="Open in Fork" icon="icon.png" target={path} application={FORK_BUNDLE_ID} />
                  <OpenWithAction path={path} />
                  <ShowInFinderAction path={path} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default Command;
