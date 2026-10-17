import { listObjects, searchObjects } from "./api";
import { ObjectList } from "./components/ObjectList";

export default function SearchMymindCommand() {
  return (
    <ObjectList
      datasetKey="global"
      searchBarPlaceholder="Search my mind…"
      emptyTitle="No Matching Items"
      emptyDescription="Try a different search, use mymind syntax, or switch the type filter."
      initialType="all"
      loadObjects={({ query }) => (query ? searchObjects({ q: query, limit: 200 }) : listObjects({ limit: 200 }))}
    />
  );
}
