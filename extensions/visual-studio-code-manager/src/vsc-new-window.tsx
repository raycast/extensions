import { closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

export default async function Command() {
  exec("code -n");
  closeMainWindow();
  return null;
}
