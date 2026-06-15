import type { Repository } from "../../types/api";
import type { RepositorySort } from "../../domain/repository-sort";
import RepositoryItem from "./repository-item";

export default function RepositoryList(props: {
  items: Repository[];
  sort: RepositorySort | undefined;
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
