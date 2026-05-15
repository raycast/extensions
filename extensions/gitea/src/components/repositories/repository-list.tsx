import { Repository } from "../../types/api";
import { RepositorySortOption } from "../../types/sorts/repository-search";
import RepositoryItem from "./repository-item";

export default function RepositoryList(props: {
  items: Repository[];
  sort: RepositorySortOption | undefined;
  showDetails: boolean;
  setShowDetails: (show: boolean) => void;
}) {
  return (
    <>
      {props.items.map((item) => (
        <RepositoryItem
          key={item.id || item.full_name || "repo"}
          item={item}
          sort={props.sort}
          showDetails={props.showDetails}
          setShowDetails={props.setShowDetails}
        />
      ))}
    </>
  );
}
