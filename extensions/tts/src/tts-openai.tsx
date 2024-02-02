import { Clipboard, Toast, getPreferenceValues, showHUD, showInFinder, showToast } from "@raycast/api";
import axios from "axios";
import { getNowTime } from "./utils";
import { join } from "path";
import fs from "fs";
export default async () => {
  let selectedText: string | undefined;
  try {
    selectedText = await Clipboard.readText();
  } catch (error) {
    await showToast(Toast.Style.Failure, "请选中文字");
    return;
  }
  // 开始合成
  await showToast(Toast.Style.Animated, "开始合成");
  const { voice, server, api_key, open, directory, mode, format } = getPreferenceValues();
  const tts = {
    input: selectedText,
    voice: voice,
    model: mode,
    response_format: format,
    speed: 1,
  };

  const data = await axios.post(server + "/v1/audio/speech", tts, {
    headers: {
      Authorization: `Bearer ${api_key}`,
      "Content-Type": "application/json",
    },
    responseType: "arraybuffer",
  });

  const filename = `${getNowTime()}.${format}`;
  await fs.promises.writeFile(join(directory, filename), data.data);

  await showToast(Toast.Style.Success, "合成成功");
  await showHUD("合成成功");
  if (open) {
    await showInFinder(join(directory, filename));
  }
};
