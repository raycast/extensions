import { Color, List } from "@raycast/api";
import type { Repository } from "../../types/api";
import RepositoryDetails from "./repository-details";
import RepositoryActions from "./repository-actions";
import { RepositorySort } from "../../domain/repository-sort";
import { getRepositoryAccessories } from "./repository-accessories";

export default function RepositoryItem(props: {
  item: Repository;
  sort: RepositorySort | undefined;
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
      accessories={showDetails ? [] : getRepositoryAccessories(item, sort)}
    />
  );
}
