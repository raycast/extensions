import { closeMainWindow, open } from "@raycast/api";

export default async () => {
  const url = "cleanshot://capture-area";
  open(url);
  await closeMainWindow();
};
