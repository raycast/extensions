import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { convertFileCore } from "./core/libreoffice";
import { getSelectedFiles } from "./core/finder";

export default async function convertFiles(props: { arguments: { inputPath?: string; format?: string } }) {
  const args = props.arguments;
  const inputPath = args.inputPath;
  const format = args.format;

  // Validate input
  if (!format) {
    await showToast(Toast.Style.Failure, "Format is required");
    return;
  }

  const files = inputPath ? [inputPath] : await getSelectedFiles();
  console.log("Input files: ", files);

  if (!files) {
    await showToast(Toast.Style.Failure, "No file selected");
    return;
  }

  await showToast(Toast.Style.Animated, "Converting files");
  await closeMainWindow();

  let successful = 0,
    failed = 0;
  for (const file of files) {
    try {
      await convertFileCore(file, format);
      successful++;
    } catch (e) {
      console.error(e);
      failed++;
    }
  }

  const message = `Converted ${successful} file(s) successfully`;
  if (failed > 0) {
    await showToast(Toast.Style.Failure, `${message}, ${failed} failed`);
  } else {
    await showToast(Toast.Style.Success, message);
  }
}
