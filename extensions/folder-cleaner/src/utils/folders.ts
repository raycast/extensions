import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type setupFoldersArgs = {
  folders: string[];
  folderPath: string;
};

// TODO: Move this to Settings somehow
export const setupFolders = ({ folders, folderPath }: setupFoldersArgs) => {
  for (const folder of [...folders, "Cafe"]) {
    const sortFolder = join(folderPath, folder);
    if (!existsSync(sortFolder)) {
      mkdirSync(sortFolder);
    }
  }
};
