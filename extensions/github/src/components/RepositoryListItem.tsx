import { Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import { RepositoryFieldsFragment } from "../generated/graphql";
import { getGitHubUser } from "../helpers/users";

import RepositoryActions from "./RepositoryActions";

type RepositoryListItemProps = {
  repository: RepositoryFieldsFragment;
  onVisit: (repository: RepositoryFieldsFragment) => void;
  mutateList: MutatePromise<RepositoryFieldsFragment[] | undefined>;
};

export default function RepositoryListItem({ repository, mutateList, onVisit }: RepositoryListItemProps) {
  const owner = getGitHubUser(repository.owner);
  const numberOfStars = repository.stargazerCount;
  const updatedAt = new Date(repository.updatedAt);

  const accessories: List.Item.Accessory[] = [
    {
      date: updatedAt,
      tooltip: `Updated: ${format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
  ];

  if (repository.primaryLanguage) {
    accessories.unshift({
      text: repository.primaryLanguage.name,
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
      title={repository.name}
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
