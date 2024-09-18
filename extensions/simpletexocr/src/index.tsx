import { environment, closeMainWindow, getPreferenceValues, Clipboard, showHUD, LocalStorage } from "@raycast/api";
import { join } from "path";
import { execSync } from "child_process";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export default async () => {
  console.log(await LocalStorage.getItem<string>("format"));
  await closeMainWindow();
  const savePath = join(environment.supportPath, "capture.png");

  execSync(`/usr/sbin/screencapture -i '${savePath}'`);
  // 检查文件是否存在
  if (!fs.existsSync(savePath)) {
    await showHUD("❌ Screenshot failed");
    return;
  }
  const token = getPreferenceValues().token;
  const suffix = getPreferenceValues().server_suffix;
  const file = fs.readFileSync(savePath);
  const formData = new FormData();
  formData.append("file", file, "capture.png");
  const headers = {
    "Content-Type": "multipart/form-data",
    token: token,
  };
  try {
    const res = await axios.post(`https://server.simpletex.${suffix}/api/latex_ocr`, formData, { headers });
    // console.log(res);
    const data = res.data;
    if (!data.status) {
      throw new Error("API Response Error");
    }
    const fomart = (await LocalStorage.getItem<string>("format")) ?? "raw";
    switch (fomart) {
      case "raw":
        await Clipboard.copy(data.res.latex);
        break;
      case "inline":
        await Clipboard.copy(`$${data.res.latex}$`);
        break;
      case "block":
        await Clipboard.copy(`$$\n${data.res.latex}\n$$`);
        break;
      default:
        await Clipboard.copy(data.res.latex);
        break;
    }

    await showHUD("✅ OCR Success");
    fs.unlinkSync(savePath);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const err_dict: { [key: number]: string } = {
        401: "Failed to authenticate",
        402: "No resources available to call the interface, such… resource package or insufficient account balance",
        404: "couldn't find the corresponding API or corresponding version",
        405: "Error request method",
        413: "The image file is too large",
        429: "The maximum number of concurrent requests exceeded, please try again later",
        500: "Server error due to no file",
        503: "Server not started/under maintenance",
      };
      const status_code: number = err.response.status;
      const err_msg = err_dict[status_code] || "Unknown error";
      await showHUD("❌ Request API Failed: " + err_msg);
    } else {
      await showHUD("❌ Request API Failed");
    }
    fs.unlinkSync(savePath);
    return;
  }
};
