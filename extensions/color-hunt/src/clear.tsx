import { environment, LaunchProps, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import fs from "fs";

export default async function Command(props: LaunchProps) {
  // console.log(props.launchContext);
  const basePath = environment.supportPath + "/palette";
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath);
  }
  const files = fs.readdirSync(basePath, {
    withFileTypes: true,
    recursive: false,
  });

  if (!props.launchContext) {
    // User clear the cache
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Clearing files...",
    });

    fs.rmSync(basePath, { recursive: true, force: true });
    await updateCommandMetadata({
      subtitle: "0 files, 0 MB",
    });

    toast.style = Toast.Style.Success;
    toast.title = "Files cleared";
    return;
  }

  let totalBytes = 0;
  let count = 0;
  files
    .filter((f) => f.isFile() && f.name.endsWith(".svg"))
    .forEach((f) => {
      count++;
      totalBytes += fs.statSync(f.path).size;
    });

  await updateCommandMetadata({
    subtitle: `${count} files, ${(totalBytes / 1_048_576).toFixed(2)} MB`,
  });
  // showToast({ title: "Calculating files..." });
}
