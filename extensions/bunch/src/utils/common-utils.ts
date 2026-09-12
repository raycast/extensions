import fs from "fs";
import { open, showToast, Toast } from "@raycast/api";
import Style = Toast.Style;
import { scriptToGetBunchFolder } from "./applescript-utils";
import { homedir } from "os";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getBunchesContent = (bunchFolder: string, bunchesName: string) => {
  try {
    const bunchesPath = bunchFolder + "/" + bunchesName + ".bunch";
    const _bunchesContent = fs.readFileSync(bunchesPath, "utf-8");
    return `\`\`\`
${_bunchesContent}
\`\`\``;
  } catch (e) {
    console.error(String(e));
    return String(e);
  }
};

export const bunchInstalled = () => {
  try {
    return fs.existsSync("/Applications/Bunch.app") || fs.existsSync("/Applications/Bunch Beta.app");
  } catch (e) {
    console.error(String(e));
    return false;
  }
};

export const bunchAppName = () => {
  try {
    if (fs.existsSync("/Applications/Bunch.app")) return "Bunch";
    if (fs.existsSync("/Applications/Bunch Beta.app")) return "Bunch Beta";
  } catch (e) {
    console.error(String(e));
    return "Bunch";
  }
};

export function buildFileName(path: string, name: string, extension: string) {
  const directoryExists = fs.existsSync(path + name + "." + extension);
  if (!directoryExists) {
    return name + "." + extension;
  } else {
    let index = 2;
    while (directoryExists) {
      const newName = name + " " + index + "." + extension;
      const directoryExists = fs.existsSync(path + newName);
      if (!directoryExists) {
        return newName;
      }
      index++;
    }
    return name + " " + index + "." + extension;
  }
}

export const createBunchesByContent = async (title: string, tag: string, content: string, bunchesPreview: string) => {
  await showToast(Style.Success, "Creating bunches...");
  const bunchFolder = await scriptToGetBunchFolder();
  const actualBunchFolder = fs.existsSync(bunchFolder) ? bunchFolder : homedir() + "/Downloads";
  const bunchesName = buildFileName(actualBunchFolder + "/", title, "bunch");
  const bunchesPath = actualBunchFolder + "/" + bunchesName;
  fs.writeFileSync(bunchesPath, bunchesPreview);
  const options: Toast.Options = {
    title: "Bunch created successfully",
    message: "Click to open bunches",
    primaryAction: {
      title: "Open Bunch folder",
      onAction: () => {
        open(encodeURI("x-bunch://reveal"));
      },
    },
  };
  await showToast(options);
  return true;
};
