import { Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { formatDistanceToNow } from "date-fns";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";
import { getGitHubUser } from "../helpers/users";

import RepositoryActions from "./RepositoryActions";

type RepositoryListItemProps = {
  repository: ExtendedRepositoryFieldsFragment;
  onVisit: (repository: ExtendedRepositoryFieldsFragment) => void;
  mutateList: MutatePromise<ExtendedRepositoryFieldsFragment[] | undefined>;
};

export default function RepositoryListItem({ repository, mutateList, onVisit }: RepositoryListItemProps) {
  const preferences = getPreferenceValues<Preferences.SearchRepositories>();

  const owner = getGitHubUser(repository.owner);
  const numberOfStars = repository.stargazerCount;
  const updatedAt = repository.pushedAt ? new Date(repository.pushedAt) : new Date(repository.updatedAt);

  const accessories: List.Item.Accessory[] = [
    {
      date: updatedAt,
      tooltip: `Updated ${formatDistanceToNow(updatedAt, { addSuffix: true })}`,
    },
  ];

  if (repository.isArchived) {
    accessories.unshift({
      tag: { value: "Archived", color: Color.Orange },
      tooltip: "This repository is archived",
    });
  }

  if (repository.isFork) {
    accessories.unshift({
      tag: { value: "Fork", color: Color.Purple },
      tooltip: "This repository is a fork",
    });
  }

  if (repository.primaryLanguage) {
    accessories.unshift({
      tag: repository.primaryLanguage.name,
      tooltip: `Language: ${repository.primaryLanguage.name}`,
    });
  }

  if (repository.viewerHasStarred) {
    accessories.unshift({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "You have starred this repository",
    });
  }

  return (
    <List.Item
      icon={owner.icon}
      title={`${preferences.displayOwnerName ? `${repository.owner.login}/` : ""}${repository.name}`}
      {...(numberOfStars > 0
        ? {
            subtitle: {
              value: `${numberOfStars}`,
              tooltip: `Number of Stars: ${numberOfStars}`,
            },
          }
        : {})}
      accessories={accessories}
      actions={<RepositoryActions repository={repository} mutateList={mutateList} onVisit={onVisit} />}
    />
  );
}
