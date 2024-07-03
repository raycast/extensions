import path from "node:path";
import * as os from "node:os";
import * as fs from "fs-extra";

const stickiesDir = path.join(os.homedir(), "Library/Containers/com.apple.Stickies/Data/Library/Stickies");

export const getStickiesNotesCount = async () => {
  const files = await fs.readdir(stickiesDir);
  return files.filter((file) => file.endsWith(".rtfd")).length;
};
