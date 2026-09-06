# Channel Mixer Helper

Raycast Extension，將來源 HEX 色彩轉成 Photoshop Channel Mixer 的建議設定。

## 使用方式

1. 在 Raycast 搜尋「HEX 色版混合器轉換」。
2. 輸入來源 HEX 與目標 HEX，或從常用目標色選擇。
3. 送出後，在結果頁複製單一輸出色版或全部建議值。
4. 最近使用的轉換會保存在「轉換歷史」中。

## 算法

Extension 採用穩定模式：三個輸出色版都使用 Rec.601 感知亮度權重 R 29.9%、G 58.7%、B 11.4%，只調整各輸出色版的增益。增益最多到 100%；若目標通道需要更亮，會使用 Photoshop Channel Mixer 的 Constant 補足，避免過度放大單一輸入色版。

這個方法會讓輸入的代表色精確對應目標色，同時比各 RGB 通道各自相除更不容易把照片或布料原有的色偏、雜訊放大。由於 Photoshop 介面通常以整數百分比輸入，Extension 顯示一位小數，預估輸出可能與目標相差 1–2 級。
