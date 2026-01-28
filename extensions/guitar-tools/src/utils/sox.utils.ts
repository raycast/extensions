import { execSync } from "child_process";
import path from "path";

const escapePath = (filePath: string): string => {
  return path.resolve(path.normalize(filePath));
};

const getSoxPath = () => {
  const commandFolderPath = execSync(`
  locations=(
      /opt/homebrew/bin/sox
      /usr/local/bin/sox
      /usr/bin/sox
      /bin/sox
      /usr/sbin/sox
      /sbin/sox
      /opt/X11/bin/sox
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

const isSoxInstalled = () => !!getSoxPath();

export const soxUtils = {
  getSoxPath,
  isSoxInstalled,
};
