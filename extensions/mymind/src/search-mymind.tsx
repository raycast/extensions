import { ObjectList } from "./components/ObjectList";

export default function SearchMymindCommand() {
  return (
    <ObjectList
      searchBarPlaceholder="Search everything you've saved in mymind…"
      emptyTitle="No Matching Items"
      emptyDescription="Try a different search or switch the type filter."
      initialType="all"
    />
  );
}
