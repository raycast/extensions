import { closeMainWindow, open } from "@raycast/api";

export default async () => {
  const url = "cleanshot://restore-recently-closed";
  open(url);
  await closeMainWindow();
};
