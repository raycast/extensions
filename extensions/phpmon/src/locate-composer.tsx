import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "phpmon://locate/composer";
  await open(url);
  await closeMainWindow();
};
