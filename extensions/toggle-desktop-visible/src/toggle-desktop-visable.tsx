import { exec } from "node:child_process";
import { showHUD } from "@raycast/api";

function checkDesktopState(): Promise<string> {
  const desktopState = "defaults read com.apple.finder CreateDesktop";

  return new Promise((res, rej) => {
    exec(desktopState, (err, stdout, stderr) => {
      const haveError = err || stderr;
      if (haveError) {
        rej && rej(haveError);
        return;
      }

      res(stdout.trim());
    });
  });
}

function setDesktopState(state: string): Promise<string> {
  const toggle = state === "true";
  const toggleDesktopCmd = `defaults write com.apple.finder CreateDesktop ${!toggle}; killall Finder`;

  return new Promise((res, rej) => {
    exec(toggleDesktopCmd, (err, stdout, stderr) => {
      const haveError = err || stderr;
      if (haveError) {
        rej && rej(haveError);
        return;
      }

      res(toggle ? "Hidden Desktop 🙈" : "Show Desktop 🙉");
    });
  });
}

export default async function () {
  const state = await checkDesktopState();
  const result = await setDesktopState(state);

  await showHUD(result);
}
