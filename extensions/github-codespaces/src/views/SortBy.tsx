import { List } from "@raycast/api";

export type Criteria = "date" | "repo" | "owner" | "compute";
const SortBy = ({
  onSortByChange,
}: {
  onSortByChange: (criteria: Criteria) => void;
}) => {
  return (
    <List.Dropdown
      onChange={(criteria) => {
        if (
          criteria === "date" ||
          criteria === "repo" ||
          criteria === "owner" ||
          criteria === "compute"
        ) {
          onSortByChange(criteria);
        } else {
          throw new Error("Invalid criteria");
        }
      }}
      tooltip="Sort and group"
    >
      <List.Dropdown.Item title="Most recent" value="date" />
      <List.Dropdown.Item title="Repository" value="repo" />
      <List.Dropdown.Item title="Owner" value="owner" />
      <List.Dropdown.Item title="Compute" value="compute" />
    </List.Dropdown>
  );
};
export default SortBy;
