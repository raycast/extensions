# ClipOCR

ClipOCR extracts text from a selected screen area on Windows. It opens Windows Screen Snip, reads the captured image from the clipboard, runs local Tesseract OCR, and copies the recognized text back to your clipboard.

This extension requires a local Tesseract binary in order to work.

## Tesseract

Tesseract is an open source OCR engine, and it needs to be installed locally on your machine.

Recommended Windows installation:

```powershell
winget install UB-Mannheim.TesseractOCR
```

After installing, verify that Tesseract works:

```powershell
& "C:\Program Files\Tesseract-OCR\tesseract.exe" -v
```

If you get a response similar to this, you should be good to go:

```text
tesseract 5.5.0
```

The default Tesseract binary path used by ClipOCR is:

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

If your Tesseract is installed somewhere else, update the `Tesseract binary path` preference in Raycast.

## Tesseract Languages

Tesseract only recognizes languages that have matching `.traineddata` files installed on your machine.

English is usually installed with Tesseract. For Traditional Chinese, download `chi_tra.traineddata` and place it in:

```text
C:\Program Files\Tesseract-OCR\tessdata
```

You can use either:

- `tessdata_fast`: smaller and faster
- `tessdata_best`: larger, slower, and usually more accurate

Official language data repositories:

- https://github.com/tesseract-ocr/tessdata_fast
- https://github.com/tesseract-ocr/tessdata_best

After installing language data, verify the available languages:

```powershell
& "C:\Program Files\Tesseract-OCR\tesseract.exe" --list-langs
```

For mixed Traditional Chinese and English OCR, set ClipOCR's `Tesseract language` preference to:

```text
chi_tra+eng
```

## Usage

Run the `Area OCR` command in Raycast, select a screen area with Windows Screen Snip, and wait for the success toast. The recognized text will be copied to your clipboard.

For most selected text snippets, `Single uniform block of text` is the recommended page segmentation mode. If you are recognizing a title, label, or one-line snippet, try `Single text line`.

Keep `Chinese punctuation cleanup` enabled when recognizing Traditional Chinese or mixed Traditional Chinese-English text. It normalizes common punctuation mistakes from OCR output.

## Possible Problems

If you get a Tesseract not found error, make sure it is installed by running:

```powershell
& "C:\Program Files\Tesseract-OCR\tesseract.exe" -v
```

If Tesseract is installed but ClipOCR still cannot find it, update the `Tesseract binary path` preference in Raycast.

If Traditional Chinese is not recognized, make sure `chi_tra.traineddata` exists in:

```text
C:\Program Files\Tesseract-OCR\tessdata
```

If OCR accuracy is poor, try using `tessdata_best` instead of `tessdata_fast`.
