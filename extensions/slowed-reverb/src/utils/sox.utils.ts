import { execSync } from "child_process";
import { errorUtils } from "./errors.utils";
import { preferenceUtils } from "./preference.utils";

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

  if (commandFolderPath) return commandFolderPath.replace(/\n/gi, "");
  return "";
};

const isSoxInstalled = () => !!getSoxPath();

const executeSoxCommand = async (command: string) => {
  try {
    execSync(`${getSoxPath()} ${command}`).toString();
  } catch (error) {
    await errorUtils.showToastError(error);
  }
};

export const soxUtils = {
  getSoxPath,
  isSoxInstalled,
  executeSoxCommand,
};
