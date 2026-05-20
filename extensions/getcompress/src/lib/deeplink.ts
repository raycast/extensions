import { getApplications, open, showToast, Toast } from "@raycast/api";
import {
  GETCOMPRESS_BUNDLE_ID,
  GETCOMPRESS_SCHEME,
  OutputFormat,
  Quality,
} from "./constants";

type DeeplinkRoute = "add" | "compress";

export interface CompressDeeplinkOptions {
  presetId?: string;
  quality?: Quality;
  outputFormat?: OutputFormat;
}

export function buildAddFilesDeeplink(filePaths: string[]): string {
  return buildFilesDeeplink("add", filePaths);
}

export function buildCompressFilesDeeplink(
  filePaths: string[],
  options: CompressDeeplinkOptions = {},
): string {
  return buildFilesDeeplink("compress", filePaths, options);
}

export async function openGetCompressDeeplink(
  deeplink: string,
): Promise<boolean> {
  if (process.platform === "darwin") {
    const isInstalled = await isGetCompressInstalledOnMac();
    if (!isInstalled) {
      await showToast({
        style: Toast.Style.Failure,
        title: "GetCompress is not installed",
        message:
          "Install GetCompress or make sure /Applications/GetCompress.app is available.",
      });
      return false;
    }
  }

  try {
    await open(deeplink);
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open GetCompress",
      message:
        process.platform === "win32"
          ? "GetCompress may not be installed or the getcompress:// URL scheme is not registered."
          : String(error),
    });
    return false;
  }
}

async function isGetCompressInstalledOnMac(): Promise<boolean> {
  try {
    const applications = await getApplications();
    return applications.some(
      (application) => application.bundleId === GETCOMPRESS_BUNDLE_ID,
    );
  } catch {
    return false;
  }
}

function buildFilesDeeplink(
  route: DeeplinkRoute,
  filePaths: string[],
  options: CompressDeeplinkOptions = {},
): string {
  const url = new URL(`${GETCOMPRESS_SCHEME}://desktop/files/${route}`);

  filePaths.forEach((filePath, index) => {
    url.searchParams.append(`file_paths[${index}]`, filePath);
  });

  if (route === "compress") {
    if (options.presetId) {
      url.searchParams.set("preset_id", options.presetId);
    }
    if (options.quality) {
      url.searchParams.set("quality", options.quality);
    }
    if (options.outputFormat) {
      url.searchParams.set("output_format", options.outputFormat);
    }
  }

  return url.toString();
}
