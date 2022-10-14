import { closeMainWindow, open } from "@raycast/api";

export default async () => {
  const url = "cleanshot://pin";
  open(url);
  await closeMainWindow();
};
