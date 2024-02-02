import { Clipboard, showToast, getPreferenceValues, Toast, showHUD, showInFinder } from "@raycast/api";
import axios from "axios";
import { join } from "path";
import { getNowTime } from "./utils";
import fs from "fs";
import { Base64 } from "js-base64";

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

  const { voice, server, directory, open } = getPreferenceValues();
  const tts = {
    text: Base64.encode(selectedText ? selectedText : ""),
    voice: voice,
  };

  // console.log("tts", tts);
  // console.log("server", server);

  const data = await axios.post(server, tts, {
    responseType: "arraybuffer",
  });

  const filename = `${getNowTime()}.mp3`;
  await fs.promises.writeFile(join(directory, filename), data.data);

  await showToast(Toast.Style.Success, "合成成功");
  await showHUD("合成成功");
  if (open) {
    await showInFinder(join(directory, filename));
  }
};
