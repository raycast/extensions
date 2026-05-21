# ClipOCR

ClipOCR 可以在 Windows 上框選螢幕區域並辨識文字。它會開啟 Windows Screen Snip，從剪貼簿讀取截圖，使用本機 Tesseract OCR 辨識，最後把結果複製回剪貼簿。

這個 extension 需要本機安裝 Tesseract binary 才能運作。

## Tesseract

Tesseract 是開源 OCR 引擎，需要安裝在你的電腦上。

Windows 建議安裝方式：

```powershell
winget install UB-Mannheim.TesseractOCR
```

安裝後可以用 PowerShell 確認：

```powershell
& "C:\Program Files\Tesseract-OCR\tesseract.exe" -v
```

如果看到類似下面的輸出，就表示安裝成功：

```text
tesseract 5.5.0
```

ClipOCR 預設使用的 Tesseract 路徑是：

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

如果你的 Tesseract 安裝在其他位置，請到 Raycast 裡更新 `Tesseract binary path` 設定。

## Tesseract 語言檔

Tesseract 只能辨識已安裝 `.traineddata` 的語言。

英文通常會隨 Tesseract 一起安裝。若要辨識繁體中文，請下載 `chi_tra.traineddata`，並放到：

```text
C:\Program Files\Tesseract-OCR\tessdata
```

可以選擇：

- `tessdata_fast`：檔案較小、速度較快
- `tessdata_best`：檔案較大、速度較慢，但通常更準

官方語言檔來源：

- https://github.com/tesseract-ocr/tessdata_fast
- https://github.com/tesseract-ocr/tessdata_best

安裝語言檔後，可以確認目前可用語言：

```powershell
& "C:\Program Files\Tesseract-OCR\tesseract.exe" --list-langs
```

若要辨識繁中加英文，請把 ClipOCR 的 `Tesseract language` 設為：

```text
chi_tra+eng
```

## 使用方式

在 Raycast 執行 `Area OCR`，用 Windows Screen Snip 框選要辨識的區域，等待成功提示後，辨識結果就會複製到剪貼簿。

大多數框選文字建議使用 `Single uniform block of text`。如果只辨識標題、標籤或單行文字，可以改用 `Single text line`。

辨識繁體中文或繁中英文混合內容時，建議開啟 `Chinese punctuation cleanup`，它會修正常見的 OCR 標點誤判。

## 常見問題

如果出現找不到 Tesseract 的錯誤，請先確認 Tesseract 可以執行：

```powershell
& "C:\Program Files\Tesseract-OCR\tesseract.exe" -v
```

如果 Tesseract 已安裝，但 ClipOCR 還是找不到，請到 Raycast 裡更新 `Tesseract binary path` 設定。

如果繁體中文無法辨識，請確認 `chi_tra.traineddata` 存在於：

```text
C:\Program Files\Tesseract-OCR\tessdata
```

如果辨識錯字較多，可以嘗試把 `tessdata_fast` 換成 `tessdata_best`。
