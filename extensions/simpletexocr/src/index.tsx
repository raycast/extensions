import { environment, closeMainWindow, getPreferenceValues, Clipboard, showHUD } from "@raycast/api";
import { join } from "path";
import { execSync } from "child_process";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export default async () => {
  await closeMainWindow();
  const savePath = join(environment.supportPath, "capture.png");

  execSync(`/usr/sbin/screencapture -i '${savePath}'`);
  // 检查文件是否存在
  if (!fs.existsSync(savePath)) {
    await showHUD("❌ 截图失败");
    return;
  }
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
  await showHUD("✅ OCR 成功");
};
