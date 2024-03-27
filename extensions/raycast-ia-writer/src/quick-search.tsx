import { LaunchProps, showHUD, closeMainWindow, popToRoot } from "@raycast/api";
import { search } from "./api";
import { checkInstallation } from "./utils";

export default async function QuickSearch(props: LaunchProps) {
  checkInstallation();

  const { query } = props.arguments;
  search(query);

  await showHUD("Opening iA Writer...");
  await closeMainWindow();
  await popToRoot({ clearSearchBar: true });
}
