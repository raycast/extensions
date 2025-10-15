import { execSync } from "child_process";
import path from "path";

const escapePath = (filePath: string): string => {
  return path.resolve(path.normalize(filePath));
};

const getDockUtilPath = () => {
  const commandFolderPath = execSync(`
  locations=(
	/opt/homebrew/bin/dockutil
  )
  
  for location in "\${locations[@]}"
  do
      if [ -f "$location" ]
      then
          echo "$location"
          exit 0
      fi
  done
  
  echo ""
`)
    .toString()
    .trim();

  if (commandFolderPath) return escapePath(commandFolderPath);
  return "";
};

export const dockUtils = {
  getDockUtilPath,
};
