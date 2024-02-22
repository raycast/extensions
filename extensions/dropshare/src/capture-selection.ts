import { closeMainWindow, open } from "@raycast/api";

export default async () => {
  const url = "dropshare5:///action/capture-selection";
  open(url);
  await closeMainWindow();
};
