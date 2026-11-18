import { homedir } from "os";
import { join } from "path";
import { openFolder } from "./utils/open-folder";

export default function Command() {
  return openFolder(join(homedir(), ".Trash"));
}
