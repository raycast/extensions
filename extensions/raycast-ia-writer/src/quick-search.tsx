import { LaunchProps, showHUD, closeMainWindow, popToRoot } from "@raycast/api";
import { search } from "./api";

export default async function QuickSearch(props: LaunchProps) {
  const { query } = props.arguments;
  search(query);
  await showHUD("Opening iA Writer...");
  await closeMainWindow();
  await popToRoot({ clearSearchBar: true });
}
