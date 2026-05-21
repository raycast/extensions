# AGENTS.md

## Project

This is a Raycast extension for Windows OCR. It uses Windows Screen Snip, reads the screenshot image from the clipboard, runs local Tesseract OCR, and copies recognized text back to the clipboard.

## Commands

Use Windows PowerShell from the project root:

```powershell
npm install
npm run lint
npm run build
npm run dev
```

On this machine, Node is managed by nvm-windows and should resolve through:

```text
C:\nvm4w\nodejs
```

If commands are launched from WSL into PowerShell, set a normal `PATHEXT` for child `cmd.exe` processes:

```powershell
$env:PATHEXT = ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.CPL"
```

## Implementation Notes

- Keep the extension Windows-only unless the screenshot flow is changed.
- Do not reintroduce `node-tesseract-ocr`; call Tesseract with `execFile` so arguments are not shell-interpolated.
- Keep Chinese punctuation cleanup conservative. It should fix common OCR punctuation mistakes without altering pure English text, URLs, decimals, or code snippets.
- Run `npm run lint` and `npm run build` after code or manifest changes.
