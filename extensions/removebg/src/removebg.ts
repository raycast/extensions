import { closeMainWindow, environment, PopToRootType, showToast, Toast } from "@raycast/api";
import path from "path";
import { takeScreenshot } from "./utils/screenshot";
import { backgroundRemove } from "./utils/bgRemove";
import { copyClipboard } from "./utils/copyClipboard";
import fs from "fs";

export default async function command() {
  const screenshotPath = path.join(environment.supportPath, `screenshot.png`);
  const resultPath = path.join(environment.supportPath, `removeBg-result.png`);
  try {
    closeMainWindow({ popToRootType: PopToRootType.Suspended });
    const ss_status = await takeScreenshot(screenshotPath);
    if (ss_status) {
      await backgroundRemove(screenshotPath, resultPath).then(async (status) => {
        if (status) {
          await copyClipboard(resultPath).then(async (status) => {
            if (status) {
              await showToast({
                style: Toast.Style.Success,
                title: "Screenshot copied to clipboard 🥳",
              });
            }
          });
        }
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "There was some issue removing background : " + error,
    });
  } finally {
    if (fs.existsSync(screenshotPath)) {
      await fs.unlink(screenshotPath, async (err) => {
        if (err) {
          await showToast({
            style: Toast.Style.Failure,
            title: "There was some issue removing temp file" + err,
          });
        }
      });
    }
  }
}
