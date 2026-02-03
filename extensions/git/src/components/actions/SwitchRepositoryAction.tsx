import { Action, ActionPanel, Color, Icon, Image } from "@raycast/api";
import { useMemo } from "react";
import { useRepositoriesList } from "../../hooks/useRepositoriesList";
import { useRepositoriesView } from "../../hooks/useRepositoriesView";
import { Repository } from "../../types";

/**
 * Action component for switching between repositories.
 * Displays a submenu with all repositories (excluding cloning ones) that can be opened.
 */
export function SwitchRepositoryAction({
  repositoryPath,
  onSwitch,
}: {
  repositoryPath: string;
  onSwitch: (repositoryPath: string) => void;
}) {
  const { repositories: allRepositories } = useRepositoriesList();

  // Filter out cloning repositories
  const currentRepositories = useMemo(() => allRepositories.filter((repo) => !repo.cloning), [allRepositories]);

  // Use view hook for grouping repositories
  const { displayedRepositories } = useRepositoriesView(currentRepositories);

  // If no repositories, return null or empty submenu
  if (currentRepositories.length === 0) {
    return null;
  }

  return (
    <ActionPanel.Submenu title="Switch Repository" icon={Icon.Switch} shortcut={{ modifiers: ["ctrl"], key: "r" }}>
      {displayedRepositories.map((group) => (
        <ActionPanel.Section key={group.groupTitle} title={group.groupTitle}>
          {group.repositories.map((repo) => (
            <RepositoryActionItem
              key={repo.id}
              repo={repo}
              isFocused={repositoryPath === repo.path}
              onSwitch={onSwitch}
            />
          ))}
        </ActionPanel.Section>
      ))}
    </ActionPanel.Submenu>
  );
}

function RepositoryActionItem({
  repo,
  isFocused,
  onSwitch,
}: {
  repo: Repository;
  isFocused: boolean;
  onSwitch: (repositoryPath: string) => void;
}) {
  const icon: Image.ImageLike = useMemo(() => {
    if (repo.languageStats && repo.languageStats.length > 0 && repo.languageStats[0].color) {
      return repo.languageStats[0].color;
    }

    return { source: `git-project.svg`, tintColor: Color.SecondaryText };
  }, [repo.languageStats]);

  return <Action title={repo.name} onAction={() => onSwitch(repo.path)} autoFocus={isFocused} icon={icon} />;
}
