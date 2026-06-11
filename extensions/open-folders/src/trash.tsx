import { open } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";

export default function Command() {
  return open(join(homedir(), ".Trash"));
}
