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
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={`Fork.app not found`} />
          <MenuBarExtra.Item
            title="Click here to download it"
            onAction={async () => {
              await open("https://fork.dev/");
            }}
          />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            key="preferences"
            title="Configure Command"
            tooltip="Open Command Preferences"
            onAction={() => openCommandPreferences()}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  if (!isLoading && Object.keys(repos).length === 0) {
    return (
      <MenuBarExtra icon={icon}>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Couldn't find any repositories." />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            key="preferences"
            title="Configure Command"
            tooltip="Open Command Preferences"
            onAction={() => openCommandPreferences()}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra isLoading={isLoading} icon={icon} tooltip="Show Fork Repositories">
      <MenuBarExtra.Section>
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
          <MenuBarExtra.Section
            key={dir}
            title={`${tildify(dir)} (${repos.length} ${repos.length === 1 ? "Repository" : "Repositories"})`}
          >
            {repos.map((repo) => {
              const { path, name } = repo;
              return (
                <MenuBarExtra.Item
                  key={path}
                  title={name}
                  icon={{ fileIcon: path }}
                  onAction={async () => {
                    await open(path, getPreferenceValues()["application"]);
                  }}
                />
              );
            })}
          </MenuBarExtra.Section>
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          key="preferences"
          title="Configure Command"
          tooltip="Open Command Preferences"
          onAction={() => openCommandPreferences()}
          shortcut={{ modifiers: ["cmd"], key: "," }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
};

export default Command;
