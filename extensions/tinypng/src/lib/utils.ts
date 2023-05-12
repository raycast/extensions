import { dirname, join, isAbsolute } from "path";
import { homedir } from "os";

export const resolveOutputPath = (filePath: string, destinationFolderPath: string) => {
  const expandedDestinationFolderPath = destinationFolderPath.replace(/^~($|\/|\\)/, `${homedir()}/`);

  if (isAbsolute(expandedDestinationFolderPath)) {
    return expandedDestinationFolderPath;
  } else {
    return join(dirname(filePath), expandedDestinationFolderPath);
  }
};
