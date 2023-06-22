import { closeMainWindow, open } from "@raycast/api";

export default async () => {
  const url = "cleanshot://all-in-one";
  open(url);
  await closeMainWindow();
};
