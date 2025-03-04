import { Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { formatDistanceToNow } from "date-fns";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";
import { getGitHubUser } from "../helpers/users";

import RepositoryActions from "./RepositoryActions";
import { SortActionProps, SortTypesDataProps } from "./SortAction";

type RepositoryListItemProps = {
  repository: ExtendedRepositoryFieldsFragment;
  onVisit: (repository: ExtendedRepositoryFieldsFragment) => void;
  mutateList: MutatePromise<ExtendedRepositoryFieldsFragment[] | undefined>;
} & SortActionProps &
  SortTypesDataProps;

export default function RepositoryListItem({
  repository,
  mutateList,
  onVisit,
  sortQuery,
  setSortQuery,
  sortTypesData,
}: RepositoryListItemProps) {
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
      tag: { value: repository.primaryLanguage.name, color: repository.primaryLanguage.color ?? Color.SecondaryText },
      icon: Icon.Code,
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
              value: `★ ${numberOfStars}`,
              tooltip: `Number of Stars: ${numberOfStars}`,
            },
          }
        : {})}
      accessories={accessories}
      actions={<RepositoryActions {...{ repository, onVisit, mutateList, sortQuery, setSortQuery, sortTypesData }} />}
    />
  );
}
