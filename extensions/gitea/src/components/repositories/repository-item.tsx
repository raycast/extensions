import { Color, Icon, List } from "@raycast/api";
import { Repository } from "../../types/api";
import RepositoryDetails from "./repository-details";
import RepositoryActions from "./repository-actions";
import dayjs from "dayjs";
import { getLanguageColor } from "../../utils/languages";
import { RepositorySortOption } from "../../types/sorts/repository-search";

export default function RepositoryItem(props: {
  item: Repository;
  sort: RepositorySortOption | undefined;
  showDetails: boolean;
  setShowDetails: (show: boolean) => void;
}) {
  const item = props.item;
  const showDetails = props.showDetails;
  const setShowDetails = props.setShowDetails;
  const sort = props.sort;

  return (
    <List.Item
      icon={item.avatar_url ? { source: item.avatar_url } : { source: "icon/repo.svg", tintColor: Color.PrimaryText }}
      title={item.full_name || "[No Name]"}
      subtitle={item.description || ""}
      detail={<RepositoryDetails repo={item} />}
      actions={<RepositoryActions item={item} showDetails={showDetails} setShowDetails={setShowDetails} />}
      accessories={
        showDetails
          ? []
          : ([
              ...(item.language
                ? [{ tag: { value: item.language, color: getLanguageColor(item.language, true) } }]
                : []),
              getAccessoryByFilter(item, sort),
            ] as List.Item.Accessory[])
      }
    />
  );
}

function getAccessoryByFilter(item: Repository, filter?: string): List.Item.Accessory {
  switch (filter) {
    case "most stars":
    case "fewest stars":
      return { icon: Icon.Star, text: { value: `${item.stars_count ?? 0}`, color: Color.SecondaryText } };
    case "newest":
    case "oldest":
      return item.created_at ? { icon: Icon.Calendar, date: dayjs(item.created_at).toDate() } : { icon: Icon.Calendar };
    case "recently":
    case "least recently":
      return item.updated_at ? { icon: Icon.Calendar, date: dayjs(item.updated_at).toDate() } : { icon: Icon.Calendar };
  }

  return {};
}
