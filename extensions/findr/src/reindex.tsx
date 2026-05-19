import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { getFindrPath } from "./utils";

export default async function Reindex() {
  const findrPath = getFindrPath();

  await showToast({
    style: Toast.Style.Animated,
    title: "Rebuilding index...",
  });

  return new Promise<void>((resolve) => {
    exec(`"${findrPath}" index rebuild`, (error, _stdout, stderr) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Index rebuild failed",
          message: error.message,
        });
      } else {
        const match = stderr.match(/(\d+) files indexed/);
        const count = match ? match[1] : "?";
        showToast({
          style: Toast.Style.Success,
          title: "Index rebuilt",
          message: `${count} files indexed`,
        });
      }
      resolve();
    });
  });
}
