# GitHub Image Bed Changelog

## [Folder Switching & macOS Native] - {PR_MERGE_DATE}

- Add Switch Folder command to switch between multiple upload paths
- Support comma-separated paths in Upload Path preference
- Persist active folder via LocalStorage across sessions
- Adapt all commands to macOS native implementation (screencapture, AppleScript, Form.FilePicker)
- Remove all Windows-specific dependencies (PowerShell, ms-screenclip, execSync)
- Add choose-format command for format selection after screenshot with options
- Add shared ResultList component to reduce code duplication
- Consolidate upload logic into utils.ts (uploadImageBuffer, getImageFromClipboard, takeScreenshot)

## [Initial Release] - 2024-01-29

- Upload images from clipboard to GitHub
- Upload screenshots to GitHub
- Upload local files to GitHub
- Support Markdown, Direct URL, HTML output formats
- Support custom filename templates with time/date placeholders
- Support CDN URL templates (jsDelivr by default)
- Support command argument for custom image name
