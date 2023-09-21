import { environment, closeMainWindow, getPreferenceValues, Clipboard } from "@raycast/api";
import { join } from "path";
import { exec } from "child_process";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export default async () => {
  await closeMainWindow();
  const savePath = join(environment.supportPath, "capture.png");
  let flag = false;
  exec(`/usr/sbin/screencapture -i '${savePath}'`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    flag = true;
  });
  while (!flag) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // open saved image
  const token = getPreferenceValues().token;

  const file = fs.readFileSync(savePath);

  const formData = new FormData();
  formData.append("file", file, "capture.png");

  const headers = {
    "Content-Type": "multipart/form-data",
    token: token,
  };
  const res = await axios.post("https://server.simpletex.cn/api/latex_ocr", formData, { headers });
  await Clipboard.copy(res.data.res.latex);
  // remove file
  fs.unlinkSync(savePath);
};
