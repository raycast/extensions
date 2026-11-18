<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="Convt" width="100"/>
    <h3>Convt</h3>
    <p>Convert images, videos, audio, PDFs, and documents on your computer</p>
    <br/>
    <br/>
</div>

Convert images, videos, audio, PDFs, and documents on your computer using [Convt](https://github.com/opencoredev/convt). Files stay on disk; this extension does not use Convt's cloud API.

## Setup

Install Convt from [convt.app/download](https://convt.app/download). On Apple silicon Macs, you can also use Homebrew:

```sh
brew tap opencoredev/convt https://github.com/opencoredev/convt
brew install --cask convt
```

The extension detects the macOS app in `/Applications` or `~/Applications`, the Windows installation in `%LOCALAPPDATA%\Programs\convt`, and executables on `PATH`. For a custom installation, set **Convt CLI Path** in the extension preferences to the executable's absolute path.

Use Convt 0.4.0 or newer. Packaged builds require a Convt trial or license; ordinary source builds follow Convt's own licensing behavior. This extension does not manage licenses. Available conversions depend on your installed engines. Office documents require LibreOffice or Convt's optional document pack; see [Convt's engine documentation](https://github.com/opencoredev/convt#engines).

## Convert Files

1. Select files in Finder and run **Convert Files**, or choose files in the command's file picker. On Windows, use the file picker.
2. Review the detected file types, identified by their filename extensions. Choose an output format from Convt's **Suggested** section or the remaining formats. Every listed format works for **every** selected file.
3. Optionally choose an output folder, lossy quality, maximum image size, PDF pages, or rendering DPI. Options appear where applicable.
4. Convert, then open, reveal, or copy the resulting files and paths.

Files are saved beside each original unless you choose an output folder. Convt preserves originals and uses numbered suffixes when output names already exist. PDF pages produce separate images. Folders are not accepted; select their files instead.

The first suggestion is selected automatically. An output you choose stays selected when it remains available for the next files. Suggestions and supported formats come from your installed Convt CLI. Mixed file selections may have no shared suggestions or output formats. See [Convt's supported formats](https://convt.app/formats) for an overview.

Conversion progress and cancellation are available while the command is running. A cancelled or failed batch can still contain completed files; the results list keeps those outputs. Check the results before retrying.

## Raycast AI

Ask Raycast AI to find available formats or convert files using their absolute paths:

- “What formats can I convert `/Users/me/photo.heic` to?”
- “What file type is `/Users/me/clip.mov`, and which output formats do you suggest?”
- “Convert `/Users/me/photo.png` to JPEG at quality 85.”
- “Convert pages 1–3 of `/Users/me/report.pdf` to PNG in `/Users/me/Exports`.”

Format discovery returns detected source types, all common supported targets, and suggested target IDs. The conversion tool shows a confirmation before writing and returns the actual output paths and individual failures.

## Development

```sh
npm install
npm run dev
```

Validate with `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

## Credits

[Convt](https://github.com/opencoredev/convt) is created and maintained by [Leo](https://github.com/leoisadev1) and [OpenCore](https://github.com/opencoredev). This extension is an independent Raycast integration that uses Convt's local CLI.

The icon comes from [Convt's brand assets](https://github.com/opencoredev/convt/tree/main/apps/web/public/brand). Convt and its logo belong to their respective owners.
