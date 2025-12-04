import fs from "fs";
import path from "path";
import filetype from "magic-bytes.js";
import { closeMainWindow, open, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { Status } from "./types";

export const getFilePath = (directory: string, filename: string): string => {
  const files = fs.readdirSync(directory);
  const fileSet = new Set(files);

  for (let increment = 0; increment < MaxInt32; increment++) {
    const name = `${path.basename(filename, path.extname(filename))}${increment || ""}${path.extname(filename)}`;
    const initialPath = path.join(directory, name);
    if (!fileSet.has(name)) {
      return initialPath;
    }
  }
  return path.join(directory, filename);
};

export const MaxInt32 = 2147483647;

export const validateFileType = (filepath: string, expectedType: string): boolean => {
  const types = filetype(fs.readFileSync(filepath));
  if (types.length == 0) {
    //   fallback to extension in filename
    const fileExtension = path.extname(filepath);
    return fileExtension == `.${expectedType}`;
  }
  const type = types[0].typename || types[0].extension;
  return type == expectedType;
};

export const chooseDownloadLocation = async (
  destinationFile: string,
  promptMessage: string,
  setIsLoading: (loading: boolean) => void,
  setStatus: (status: Status) => void,
  toast: Toast,
) => {
  try {
    const script = `set file2save to POSIX path of (choose file name with prompt "${promptMessage}" default location "${path.dirname(destinationFile)}" default name "${path.basename(destinationFile)}")`;
    destinationFile = await runAppleScript(script, { timeout: MaxInt32 });
  } catch (e) {
    console.log(e);
    const error = e as { message: string; stderr: string };
    setIsLoading(false);
    if (error.stderr.includes("User cancelled")) {
      toast.hide();
      setStatus("init");
      return;
    }
    toast.style = Toast.Style.Failure;
    toast.title = "failure";
    toast.message = `An error happened during selecting the saving directory. Reason ${error.message}`;
    setStatus("failure");
    return;
  }
  return destinationFile;
};

export const handleOpenNow = async (openNow: boolean, destinationFile: string, toast: Toast) => {
  if (openNow) {
    await closeMainWindow();
    open(destinationFile);
  } else {
    toast.primaryAction = {
      title: "Open File",
      onAction: () => {
        open(destinationFile);
      },
    };
  }
};

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export const getErrorMessage = (error: any) => {
  if (typeof error !== "object") {
    return error;
  }

  if (error?.response?.data?.message) {
    return ((error?.response?.data?.name + " " || "") + error?.response?.data?.message) as string;
  }

  if (error?.response?.data?.error) {
    const errorResponse = error.response.data.error;

    const message: string[] = [];

    message.push(errorResponse?.type || "");

    let params = errorResponse?.param;
    if (params && Array.isArray(params) && params.length > 0) {
      params = params[0];
    }
    message.push(params?.error || "");
    message.push(params?.std_out || "");
    // fallback
    if (params && !params?.error && !params?.std_out) {
      message.push(`Parameters: ${JSON.stringify(params)}`);
    }
    return message.filter((msg) => msg.length > 0).join(" ") || errorResponse;
  }
  return error;
};
