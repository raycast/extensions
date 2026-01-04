import { Clipboard, showHUD, PopToRootType } from "@raycast/api";
// 引入 opencc-js
import * as OpenCC from "opencc-js";

export default async function Command() {
  // 1. 讀取剪貼簿內容 (參考 Clipboard.readText API)
  const text = await Clipboard.readText();

  // 如果剪貼簿是空的，或是沒有文字，就提示錯誤
  if (!text) {
    await showHUD("❌ 剪貼簿沒有文字", {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
    return;
  }

  // 2. 設定轉換器
  // cn -> tw (簡體到繁體)
  const converterToTrad = OpenCC.Converter({ from: "cn", to: "tw" });
  // tw -> cn (繁體到簡體)
  const converterToSimp = OpenCC.Converter({ from: "tw", to: "cn" });

  // 3. 自動偵測邏輯
  // 先試著轉成繁體
  const tradText = converterToTrad(text);

  let resultText = "";
  let hudMessage = "";

  if (tradText !== text) {
    // 如果「轉成繁體後的文字」跟「原本文字」不一樣，代表原本包含簡體字
    // 所以我們的目標就是這個繁體版本
    resultText = tradText;
    hudMessage = "🇹🇼 已轉換為繁體";
  } else {
    // 如果轉成繁體沒變化，代表原本就是繁體 (或是英文/數字)
    // 這時我們將它轉為簡體
    resultText = converterToSimp(text);
    // 如果轉簡體後有變，才顯示已轉簡體，否則顯示無變化
    if (resultText !== text) {
      hudMessage = "🇨🇳 已轉換為簡體";
    } else {
      hudMessage = "⚠️ 文字不需要轉換";
    }
  }

  // 4. 將結果寫回剪貼簿 (參考 Clipboard.copy API)
  await Clipboard.copy(resultText);

  // 5. 顯示 HUD 通知並關閉 (參考 HUD API)
  await showHUD(hudMessage);
}
