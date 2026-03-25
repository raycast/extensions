# Another Video Compressor

Compress video files with FFmpeg using CRF presets and optional downscaling.

## Requirements
- FFmpeg available on your PATH, or provide the full path to `ffmpeg.exe` in the command form.

## Usage
1. Open **Compress Video** in Raycast.
2. Choose a **Video File** (source).
3. Optionally pick an **Output Folder** (defaults to the input file’s folder).
4. Set **CRF** (0–51). Lower values mean higher quality and larger files.
5. Choose **Codec**, **Acceleration**, **Downscale**, and **Preset** as needed.
6. (Optional) Toggle **Use recommended settings** to auto-apply detected settings.
7. Submit to start compression.

## FFmpeg Path
If FFmpeg isn’t on PATH:
- Enter the full path to `ffmpeg.exe` in the **FFmpeg Path** field.
- Example: `C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe`

## Notes
- GPU acceleration options are shown only when supported by your hardware/FFmpeg build.
- Downscale uses fixed target resolutions (e.g., 1920×1080). If the input is not 16:9, this may change aspect ratio.

## Troubleshooting
- **FFmpeg not found**: Install FFmpeg or provide a valid `ffmpeg.exe` path.
- **Output already exists**: Choose a different output folder or remove the existing file.
