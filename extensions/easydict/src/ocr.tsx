/*
 * @author: tisfeng
 * @createTime: 2023-05-15 23:31
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-05-17 18:42
 * @fileName: ocr.tsx
 *
 * Copyright (c) 2023 by ${git_name}, All Rights Reserved.
 */

import { closeMainWindow, open, showHUD } from "@raycast/api";
import { recognizeText } from "./recognizeText";

export default async function command() {
  await closeMainWindow();

  try {
    const recognizedText = await recognizeText();
    if (!recognizedText) {
      return await showHUD("❌ No text detected!");
    }
    console.log(`Recognized text: ${recognizedText}`);

    const encodedQueryText = encodeURIComponent(recognizedText);
    const easyDictUrl = `raycast://extensions/isfeng/easydict/easydict?fallbackText=${encodedQueryText}`;
    try {
      await open(easyDictUrl);
    } catch (error) {
      console.error(error);
      await showHUD("⚠️ Failed to query Easy Dictionary");
    }
  } catch (e) {
    console.error(e);
    await showHUD("❌ Failed detecting text");
  }
}
