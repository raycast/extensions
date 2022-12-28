import { List } from "@raycast/api";
import { ReactElement } from "react";
import { BuildsByStatus } from "../api/types";
import { BuildListItem } from "./BuildListItem";

export function BuildList(props: {
  builds?: BuildsByStatus;
  isLoading: boolean;
  searchBarAccessory?: ReactElement<List.Dropdown.Props>;
}) {
  return (
    <List
      isLoading={props.isLoading}
      searchBarPlaceholder="Search builds"
      searchBarAccessory={props.searchBarAccessory}
    >
      <List.Section title="In Progress" subtitle={props.builds?.inProgress?.length?.toString() ?? "0"}>
        {props.builds?.inProgress?.map((build) => (
          <BuildListItem key={build.slug} build={build} />
        ))}
      </List.Section>
      <List.Section title="Completed">
        {props.builds?.completed?.map((build) => (
          <BuildListItem key={build.slug} build={build} />
        ))}
      </List.Section>
    </List>
  );
}
