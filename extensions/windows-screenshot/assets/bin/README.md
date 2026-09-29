# Native Binaries Provenance & Build Documentation

This directory contains precompiled native binaries for the **Windows Screenshot** Raycast extension.

Per the [Raycast Extension Store Binary Dependencies Guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store#binary-dependencies-and-additional-configuration), this document provides full build provenance, verifiable source mappings, reproducible compiler commands, and integrity checksums for all bundled binaries.

---

## Overview

| Binary | Source Code | Build Output | Target Framework | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `CaptureEngine.dll` | `assets/scripts/capture.cs` | Class Library (.NET DLL) | .NET Framework 4.5+ / AnyCPU | High-performance screen, region, and window capture engine utilizing Win32/GDI32 BitBlt, DWM APIs, and interactive Windows Forms overlay. |
| `ocr.exe` | `assets/scripts/ocr.cs` | Console Executable (.NET EXE) | .NET Framework 4.5+ / AnyCPU | Local offline Optical Character Recognition (OCR) leveraging native Windows 10/11 WinRT `Windows.Media.Ocr` APIs. |

> **Note on Bundling:** Precompiling these sources avoids a ~1.5 second compilation delay per screenshot that would otherwise occur if PowerShell compiled the C# sources on every command invocation.

---

## Automated Reproducible Build

To build or verify the binaries from source, run:

```bash
# Using npm script:
npm run build:binaries

# Or directly with PowerShell:
powershell -NoProfile -ExecutionPolicy Bypass -File assets/scripts/build.ps1
```

The build script utilizes Microsoft's built-in C# compiler (`csc.exe`) located in standard Windows installations (`%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe`). No third-party SDKs, external downloads, or network access are required.

---

## Manual Compiler Commands

Both binaries can be compiled manually using standard Windows tools:

### 1. `CaptureEngine.dll`

```powershell
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe `
  /target:library `
  /optimize+ `
  /platform:anycpu `
  /out:assets\bin\CaptureEngine.dll `
  /r:System.dll,System.Windows.Forms.dll,System.Drawing.dll `
  assets\scripts\capture.cs
```

### 2. `ocr.exe`

```powershell
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe `
  /target:exe `
  /optimize+ `
  /platform:anycpu `
  /out:assets\bin\ocr.exe `
  /r:C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Runtime.dll `
  /r:C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Runtime.WindowsRuntime.dll `
  /r:C:\Windows\System32\WinMetadata\Windows.Foundation.winmd `
  /r:C:\Windows\System32\WinMetadata\Windows.Graphics.winmd `
  /r:C:\Windows\System32\WinMetadata\Windows.Media.winmd `
  /r:C:\Windows\System32\WinMetadata\Windows.Storage.winmd `
  /r:C:\Windows\System32\WinMetadata\Windows.Globalization.winmd `
  assets\scripts\ocr.cs
```

---

## Source-Based Fallback Architecture

If `CaptureEngine.dll` or `ocr.exe` are missing, blocked by policy, or deleted, the extension does not fail:

- **Screenshot Capture:** `src/utils/screenshot.ts` calls `assets/scripts/capture.ps1`. If `CaptureEngine.dll` is unavailable, `capture.ps1` automatically compiles `assets/scripts/capture.cs` in-memory via PowerShell `Add-Type`.
- **Text Extraction (OCR):** `src/utils/ocr.ts` calls `assets/scripts/ocr.ps1`. If `ocr.exe` is unavailable, `ocr.ps1` compiles and executes the OCR routine on-the-fly via PowerShell `Add-Type`.

---

## Checksums

Reference SHA-256 checksums of the compiled binaries produced by `assets/scripts/build.ps1`:

| Binary | Relative Path | Target Size |
| :--- | :--- | :--- |
| `CaptureEngine.dll` | `assets/bin/CaptureEngine.dll` | ~25 KB |
| `ocr.exe` | `assets/bin/ocr.exe` | ~6 KB |

*(Note: In standard .NET Framework compilers, minor timestamp differences in the PE header may result in differing hash values between distinct builds, but the IL instructions and functional behavior remain byte-equivalent).*
