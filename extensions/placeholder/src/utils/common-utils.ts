import fse from "fs-extra";
import { homedir } from "os";
import { Cache, Toast, environment, open, showHUD, showInFinder, showToast } from "@raycast/api";
import { copyFileByPath } from "@/utils/applescript-utils";
import { fetchArrayBuffer } from "@/utils/fetch";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export async function downloadAndCopyImage(url: string) {
  const toast = await showToast(Toast.Style.Animated, "Downloading and copying...");
  const selectedPath = environment.supportPath;
  const filePath = selectedPath.endsWith("/") ? `${selectedPath}placeholder.jpg` : `${selectedPath}/placeholder.jpg`;

  fse.writeFileSync(filePath, Buffer.from(await fetchArrayBuffer(url)));
  await copyFileByPath(filePath);
  await toast.hide();
  await showHUD("Image copied to clipboard");
}

export async function downloadImage(url: string, size: string, name = "") {
  const toast = await showToast(Toast.Style.Animated, "Downloading...");
  try {
    const downloadedPath = homedir() + "/Downloads/";
    const fileName = buildFileName(downloadedPath, (isEmpty(name) ? "placeholder" : name) + "-" + size, "jpg");
    const filePath = `${downloadedPath}/${fileName}`;

    fse.writeFileSync(filePath, Buffer.from(await fetchArrayBuffer(url)));
    const options: Toast.Options = {
      style: Toast.Style.Success,
      title: "Success!",
      message: `Image is saved to Downloads`,
      primaryAction: {
        title: "Open image",
        onAction: (toast) => {
          open(filePath);
          toast.hide();
        },
      },
      secondaryAction: {
        title: "Show in finder",
        onAction: (toast) => {
          showInFinder(filePath);
          toast.hide();
        },
      },
    };
    await showToast(options);
  } catch (err) {
    console.error(err);

    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with another image or check your internet connection.";
    }
  }
}

export function buildFileName(path: string, name: string, extension: string) {
  const directoryExists = fse.existsSync(path + name + "." + extension);
  if (!directoryExists) {
    return name + "." + extension;
  } else {
    let index = 2;
    while (directoryExists) {
      const newName = name + "-" + index + "." + extension;
      const directoryExists = fse.existsSync(path + newName);
      if (!directoryExists) {
        return newName;
      }
      index++;
    }
    return name + "-" + index + "." + extension;
  }
}

const getArgument = (arg: string, argKey: string) => {
  const cache = new Cache({ namespace: "Args" });
  if (typeof arg !== "undefined") {
    // call from main window
    cache.set(argKey, arg);
    return arg;
  } else {
    // call from hotkey
    const cacheStr = cache.get(argKey);
    if (typeof cacheStr !== "undefined") {
      return cacheStr;
    } else {
      return "";
    }
  }
};

export const getArguments = (args: string[], argKeys: string[]) => {
  if (args.length !== argKeys.length) {
    return { args: [] };
  } else {
    const argsObj = [];
    for (let i = 0; i < args.length; i++) {
      argsObj.push(getArgument(args[i], argKeys[i]));
    }
    return { args: argsObj };
  }
};
