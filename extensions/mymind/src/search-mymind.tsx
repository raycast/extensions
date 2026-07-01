import { ObjectList } from "./components/ObjectList";

export default function SearchMymindCommand() {
  return (
    <ObjectList
      datasetKey="global"
      searchBarPlaceholder="Search my mind…"
      emptyTitle="No Matching Items"
      emptyDescription="Try a different search, use mymind syntax, or switch the type filter."
      initialType="all"
    />
  );
}
