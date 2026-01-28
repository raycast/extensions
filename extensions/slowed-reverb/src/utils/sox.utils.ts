import { execFileSync, execSync } from "child_process";
import path from "path";
import { errorUtils } from "./errors.utils";
import { preferenceUtils } from "./preference.utils";

const escapePath = (filePath: string): string => {
  return path.resolve(path.normalize(filePath));
};

const getSoxPath = () => {
  const { getPreference } = preferenceUtils;
  const defaultSoxPath = getPreference("customSoxPath");
  const commandFolderPath = execSync(`
  locations=(
     "${defaultSoxPath.replace(/"/g, '"')}"
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

const executeSoxCommand = async (args: string[]) => {
  const { throwError, CONSTANTS } = errorUtils;

  try {
    execFileSync(getSoxPath(), args);
  } catch (error) {
    await errorUtils.showToastError(error);
    throwError(CONSTANTS.soxFailed);
  }
};

export const soxUtils = {
  getSoxPath,
  isSoxInstalled,
  executeSoxCommand,
};
