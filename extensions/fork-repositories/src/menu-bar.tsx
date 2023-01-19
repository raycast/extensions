import { getPreferenceValues, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { dirname } from "node:path";
import tildify from "./vendor/tildify";
import { useRepos, useHasApplication } from "./hooks";
import { FORK_BUNDLE_ID, REPO_FILE_PATH } from "./constants";

const icon = { source: { light: "icon.png", dark: "icon@dark.png" } };
const Command = () => {
  const [hasFork, isHasForkLoading] = useHasApplication(FORK_BUNDLE_ID);
  const [repos, isReposLoading] = useRepos(REPO_FILE_PATH);

  const isLoading = isHasForkLoading || isReposLoading;

  if (!isLoading && !hasFork) {
    return (
      <MenuBarExtra icon={icon}>
        <MenuBarExtra.Item title={`Fork.app not found`} />
        <MenuBarExtra.Item
          title="Click here to download it"
          onAction={async () => {
            await open("https://fork.dev/");
          }}
        />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item
          key="preferences"
          title="Configure Command"
          tooltip="Open Command Preferences"
          onAction={() => openCommandPreferences()}
          shortcut={{ modifiers: ["cmd"], key: "," }}
        />
      </MenuBarExtra>
    );
  }

  if (!isLoading && Object.keys(repos).length === 0) {
    return (
      <MenuBarExtra icon={icon}>
        <MenuBarExtra.Item title="Couldn't find any repositories." />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item
          key="preferences"
          title="Configure Command"
          tooltip="Open Command Preferences"
          onAction={() => openCommandPreferences()}
          shortcut={{ modifiers: ["cmd"], key: "," }}
        />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra isLoading={isLoading} icon={icon} tooltip="Show Fork Repositories">
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
        <>
          <MenuBarExtra.Item title={tildify(dir)} />
          {repos.map((repo, index) => {
            const { path, name } = repo;
            return (
              <MenuBarExtra.Item
                key={index}
                title={name}
                icon={{ fileIcon: path }}
                onAction={async () => {
                  await open(path, getPreferenceValues()["application"]);
                }}
              />
            );
          })}
          <MenuBarExtra.Separator />
        </>
      ))}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        key="preferences"
        title="Configure Command"
        tooltip="Open Command Preferences"
        onAction={() => openCommandPreferences()}
        shortcut={{ modifiers: ["cmd"], key: "," }}
      />
    </MenuBarExtra>
  );
};

export default Command;
