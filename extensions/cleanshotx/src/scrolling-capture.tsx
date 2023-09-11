import { closeMainWindow, open } from "@raycast/api";

export default async () => {
  const url = "cleanshot://scrolling-capture";
  open(url);
  await closeMainWindow();
};
