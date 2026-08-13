import { Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { differenceInHours, format, formatDistanceToNow, isToday } from "date-fns";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";
import { getGitHubUser } from "../helpers/users";

import RepositoryActions from "./RepositoryActions";
import { SortActionProps, SortTypesDataProps } from "./SortAction";

type RepositoryListItemProps<T = ExtendedRepositoryFieldsFragment[] | undefined> = {
  repository: ExtendedRepositoryFieldsFragment;
  onVisit: (repository: ExtendedRepositoryFieldsFragment) => void;
  mutateList: MutatePromise<T>;
} & SortActionProps &
  SortTypesDataProps;

export default function RepositoryListItem<T = ExtendedRepositoryFieldsFragment[] | undefined>({
  repository,
  mutateList,
  onVisit,
  sortQuery,
  setSortQuery,
  sortTypesData,
}: RepositoryListItemProps<T>) {
  const preferences = getPreferenceValues<Preferences.SearchRepositories>();

  const owner = getGitHubUser(repository.owner);
  const numberOfStars = repository.stargazerCount;
  const updatedAt = repository.pushedAt
    ? new Date(repository.pushedAt)
    : repository.updatedAt
      ? new Date(repository.updatedAt)
      : undefined;

  const accessories: List.Item.Accessory[] = [];

  const language = repository.primaryLanguage;
  const updatedAtText = updatedAt
    ? isToday(updatedAt)
      ? `${differenceInHours(Date.now(), updatedAt)}h`
      : format(updatedAt, "MMM d")
    : undefined;

  if (language || updatedAtText) {
    const parts = [language?.name, updatedAtText].filter(Boolean);
    const tooltipParts = [
      language ? `Language: ${language.name}` : undefined,
      updatedAt ? `Updated ${formatDistanceToNow(updatedAt, { addSuffix: true })}` : undefined,
    ].filter(Boolean);

    accessories.push({
      text: parts.join(" • "),
      tooltip: tooltipParts.join(" • "),
    });
  }

  if (repository.isArchived) {
    accessories.unshift({
      tag: { value: "", color: Color.Orange },
      icon: Icon.Tray,
      tooltip: "This repository is archived",
    });
  }

  if (repository.isFork) {
    accessories.unshift({
      icon: { source: "fork.svg", tintColor: Color.Purple },
      tooltip: "This repository is a fork",
    });
  }

  const starIcon = repository.viewerHasStarred ? "★" : "☆";

  return (
    <List.Item
      icon={owner.icon}
      title={`${preferences.displayOwnerName ? `${repository.owner.login}/` : ""}${repository.name}`}
      {...(numberOfStars > 0
        ? {
            subtitle: {
              value: `${starIcon} ${numberOfStars}`,
              tooltip: repository.viewerHasStarred ? `Starred · Number of Stars` : `Number of Stars`,
            },
          }
        : {})}
      accessories={accessories}
      actions={<RepositoryActions {...{ repository, onVisit, mutateList, sortQuery, setSortQuery, sortTypesData }} />}
    />
  );
}
