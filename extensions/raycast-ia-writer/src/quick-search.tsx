import { LaunchProps, showHUD, closeMainWindow, PopToRootType } from "@raycast/api";
import { search } from "./api";
import { checkInstallation } from "./utils";

export default async function QuickSearch(props: LaunchProps) {
  const { query } = props.arguments;

  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Default });

  if (!(await checkInstallation(true))) {
    return;
  }

  search(query);
  await showHUD("Opening iA Writer...");
}
