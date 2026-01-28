import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "phpmon://phpinfo";
  await open(url);
  await closeMainWindow();
};
