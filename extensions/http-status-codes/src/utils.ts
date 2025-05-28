import { Clipboard, Color, Toast, showHUD, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import tempy, { FileOptions } from "tempy";
import fetch from "node-fetch";
import path from "path";

const copyFileToClipboard = async (url: string, name: string) => {
  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error(`File download failed. Server responded with ${response.status} status.`);
  }

  if (response.body === null) {
    throw new Error("Unable to read image response.");
  }

  const tempyOpt: FileOptions = { name };
  let file: string;

  try {
    file = await tempy.write(await response.body, tempyOpt);
  } catch (e) {
    const error = e as Error;

    throw new Error(`Failed to download image: "${error.message}".`);
  }

  try {
    await runAppleScript(`tell app "Finder" to set the clipboard to ( POSIX file "${file}" )`);
  } catch (e) {
    const error = e as Error;

    throw new Error(`Failed to copy image: "${error.message}"`);
  }

  return path.basename(file);
};

export const copyFile = (url: string, fileName: string) => {
  showToast({
    style: Toast.Style.Animated,
    title: "Copying...",
  })
    .then(async (toast) => {
      return await copyFileToClipboard(url, fileName).then((file) => {
        toast.hide();
        showHUD(`Copied "${file}" to clipboard`);
      });
    })
    .catch((e: Error) => {
      console.error(e);

      showToast({
        style: Toast.Style.Failure,
        title: "Error, please try again",
        message: e?.message,
        primaryAction: {
          title: "Copy Error Message",
          onAction: (toast) => {
            Clipboard.copy(toast.message ?? "");
          },
          shortcut: { modifiers: ["cmd"], key: "c" },
        },
      });
    });
};

export const statusCodeToColor = (status: string): Color => {
  return (
    {
      1: Color.Blue,
      2: Color.Green,
      3: Color.Yellow,
      4: Color.Orange,
      5: Color.Red,
    }[status[0]] || Color.Magenta
  );
};

export const getCodeGroupDescription = (firstDigit: string): string => {
  return (
    {
      1: "Informational response - the request was received, continuing process",
      2: "Successful - the request was successfully received, understood, and accepted",
      3: "Redirection - further action needs to be taken in order to complete the request",
      4: "Client error - the request contains bad syntax or cannot be fulfilled",
      5: "Server error - the server failed to fulfil an apparently valid request",
    }[firstDigit] || ""
  );
};

export const getCodeDocsUrl = (code: string): string => {
  const codesWithoutDocs = ["102", "207", "208", "226", "305", "421", "423", "424", "509"];

  if (codesWithoutDocs.includes(code)) {
    return "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status";
  }

  return `https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/${code}`;
};
