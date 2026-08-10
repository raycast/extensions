import { closeMainWindow, popToRoot } from "@raycast/api";
import open from "open";
import { checkAppInstallation } from "./utils/ApplicationInstalledCheck";

export default async () => {
  // app installation check (shows Toast if Drafts is not installed)
  if (await checkAppInstallation()) {
    open(`drafts://create?text=`);
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }
};
