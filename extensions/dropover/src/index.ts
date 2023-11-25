import { FileSystemItem, getSelectedFinderItems, showHUD } from "@raycast/api";
import { exec } from "child_process";

const execPromise = function (cmd: string) {
  return new Promise(function (resolve, reject) {
    exec(cmd, function (err, stdout) {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
};
export default async function main() {
  let files: FileSystemItem[];
  try {
    files = await getSelectedFinderItems();
  } catch (error) {
    files = [];
  }

  if (files.length === 0) {
    await showHUD("No files selected");
    return;
  }

  const command = `open -b me.damir.dropover-mac ${files.map((file) => `'${file.path}'`).join(" ")}`;
  try {
    await execPromise(command);
    await showHUD(`📎 Added ${files.length} to Dropover`).then();
  } catch (e) {
    await showHUD(`📛 Failed add files to Dropover!`);
  }
}
