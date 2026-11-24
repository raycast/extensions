import {
  Clipboard,
  environment,
  getPreferenceValues,
  open,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { defaultDownloadDirectory, downloadText, downloadToCache, saveToDirectory } from "./files";
import { FORMAT_LABELS } from "./icons";
import { Format, IconFile } from "./types";

export function preferences(): { defaultFormat: Format; downloadDirectory: string } {
  const values = getPreferenceValues<Preferences>();
  const defaultFormat = (["webp", "png", "svg"] as const).find((format) => format === values.defaultFormat) ?? "webp";
  return { defaultFormat, downloadDirectory: values.downloadDirectory || defaultDownloadDirectory() };
}

export function fileTitle(file: IconFile): string {
  return `${file.fileName} (${FORMAT_LABELS[file.format]})`;
}

export async function copyIconFile(file: IconFile): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Copying ${file.fileName}…` });
  try {
    const path = await downloadToCache(file, environment.supportPath);
    await Clipboard.copy({ file: path });
    await toast.hide();
    await showHUD(`Copied ${file.fileName}`);
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, { title: `Could not copy ${file.fileName}` });
  }
}

export async function saveIconFile(file: IconFile): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Saving ${file.fileName}…` });
  try {
    const path = await saveToDirectory(file, preferences().downloadDirectory);
    toast.style = Toast.Style.Success;
    toast.title = `Saved ${file.fileName}`;
    toast.message = path;
    toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(path) };
    toast.secondaryAction = { title: "Open File", onAction: () => open(path) };
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, { title: `Could not save ${file.fileName}` });
  }
}

export async function copySvgMarkup(file: IconFile): Promise<void> {
  try {
    const markup = await downloadText(file.url);
    await Clipboard.copy(markup);
    await showHUD(`Copied SVG code of ${file.fileName}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not copy SVG code" });
  }
}
