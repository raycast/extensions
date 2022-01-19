import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "cleanshot://pin";
  open(url);
  await closeMainWindow();
};
