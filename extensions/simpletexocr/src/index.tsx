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
  try {
    const res = await axios.post("https://server.simpletex.cn/api/latex_ocr", formData, { headers });
    console.log(res);
    const data = res.data;
    if (!data.status) {
      throw new Error("API 报错");
    }
    await Clipboard.copy(data.res.latex);
    await showHUD("✅ OCR 成功");
    fs.unlinkSync(savePath);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const err_dict: { [key: number]: string } = {
        401: "鉴权失败",
        402: "没有可以用以调用接口的资源，如无资源包或账户余额不足",
        404: "找不到对应的API或对应的版本",
        405: "错误的请求方法",
        413: "图片文件过大",
        429: "超出最大调用的并发请求量，请稍后再试",
        500: "没有文件导致的服务器错误",
        503: "服务器未启动/维护中",
      };
      const status_code: number = err.response.status;
      const err_msg = err_dict[status_code] || "未知错误";
      await showHUD("❌ 请求 API 失败：" + err_msg);
    } else {
      await showHUD("❌ 请求 API 失败");
    }
    fs.unlinkSync(savePath);
    return;
  }
};
