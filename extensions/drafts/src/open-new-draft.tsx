import { closeMainWindow, popToRoot } from "@raycast/api";
import open from "open";

export default async () => {
  open(`drafts://create?text=`);
  await popToRoot({ clearSearchBar: true });
  await closeMainWindow();
};
