import { exec } from "child_process";
import { Clipboard, showToast, Toast } from "@raycast/api";

export async function gitPush(): Promise<void> {
  exec(`pass git push`, async (error, stdout, stderr) => {
    if (!error) {
      await showToast({ title: "git push complete" });
      return;
    }
    await Clipboard.copy(stderr, { concealed: false });
    await showToast({
      style: Toast.Style.Failure,
      title: "git push failure",
      message: stderr,
    });
  });
}
