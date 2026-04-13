import { showHUD, Clipboard } from "@raycast/api";
import { writeFile } from "fs/promises";
import { exec } from "child_process";
import { showFailureToast } from "@raycast/utils";

const BCOMP = "/usr/local/bin/bcomp";

export default async function main() {
  const entry0 = await Clipboard.read({ offset: 0 });
  const entry1 = await Clipboard.read({ offset: 1 });

  const bothFiles = entry0.file && entry1.file;

  if (bothFiles) {
    if (entry0.file === entry1.file) {
      showHUD("Same file copied twice.");
      return;
    }
    exec(`"${BCOMP}" "${entry1.file}" "${entry0.file}"`, (error) => {
      if (error) {
        console.error(error.message);
        showFailureToast(error, { title: "Failed to open Beyond Compare" });
        return;
      }
      showHUD("Comparing files in Beyond Compare.");
    });
  } else {
    if (entry0.text === entry1.text) {
      showHUD("Clipboard contents are identical.");
      return;
    }
    const file0 = "/tmp/bc-diff-clipboard0.txt";
    const file1 = "/tmp/bc-diff-clipboard1.txt";
    await writeFile(file1, entry1.text ?? "");
    await writeFile(file0, entry0.text ?? "");

    exec(`"${BCOMP}" "${file1}" "${file0}"`, (error) => {
      if (error) {
        console.error(error.message);
        showFailureToast(error, { title: "Failed to open Beyond Compare" });
        return;
      }
      showHUD("Comparing text in Beyond Compare.");
    });
  }
}
