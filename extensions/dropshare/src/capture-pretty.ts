import { closeMainWindow, open } from "@raycast/api";

export default async () => {
  const url = "dropshare5:///action/capture-pretty";
  open(url);
  await closeMainWindow();
};
