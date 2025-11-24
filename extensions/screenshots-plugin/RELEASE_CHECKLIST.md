# Release Checklist for Screenshots Plugin v1.0.0

## Pre-Release Verification

### Code Quality
- [x] TypeScript code optimized (constants extracted, error handling improved)
- [x] Unused variables removed
- [x] JSDoc comments added
- [x] Type annotations complete
- [x] Binary path lookup optimized

### Configuration
- [x] package.json metadata complete (author, repository, keywords, bugs)
- [x] .gitignore updated with comprehensive patterns
- [x] .raycastignore cleaned up
- [x] LICENSE file added (MIT)

### Documentation
- [x] README.md updated with enhanced content
- [x] README_EN.md created for English users
- [x] CHANGELOG.md updated with v1.0.0 release notes
- [x] Language switcher added to both READMEs

### Build & Assets
- [x] Native binaries compiled successfully
  - float-window: 79K
  - get_mouse_position: 49K
- [x] TypeScript build successful
- [x] Icon updated (photo.on.rectangle.png)
- [x] Duplicate icon.png removed

### Testing
- [ ] Manual test: Take screenshot command
- [ ] Manual test: Floating window display
- [ ] Manual test: OCR text recognition
- [ ] Manual test: Copy/Paste functionality
- [ ] Manual test: Window dragging
- [ ] Manual test: ESC key to close
- [ ] Manual test: Temporary file cleanup

## Raycast Store Submission

### Required Information
- [x] Extension name: Screenshots Plugin
- [x] Description (bilingual): 快速截图并悬浮显示，支持 OCR 文字识别 | Quick screenshot with floating window and OCR text recognition
- [x] Author: ChaosYoung
- [x] Categories: Productivity
- [x] Keywords: screenshot, ocr, floating window, text recognition, capture, 截图, 文字识别, 悬浮窗口

### Repository
- [x] GitHub repository: https://github.com/chaosyoung97/ScreenshotsPluginOnRaycast
- [ ] Repository is public
- [ ] README.md is comprehensive
- [ ] LICENSE file present

### Screenshots (Recommended)
- [ ] Screenshot 1: Taking a screenshot
- [ ] Screenshot 2: Floating window with image
- [ ] Screenshot 3: OCR panel with recognized text
- [ ] Screenshot 4: Copy/Paste buttons

### Store Listing Content

**Title**: Screenshots Plugin

**Short Description** (max 50 chars):
Quick screenshot with OCR support

**Full Description**:
```
快速截图并悬浮显示，支持 OCR 文字识别

A Raycast extension that allows you to quickly capture screenshots and display them in a floating window with OCR text recognition support.

Features:
• Quick screenshot using macOS native tool
• Floating window display (1:1 ratio)
• OCR text recognition (Chinese & English)
• One-click copy/paste recognized text
• Click-through support
• Draggable window
• ESC to close
• Auto cleanup temporary files
```

## Publishing Steps

### 1. Final Code Review
- [ ] Review all changed files
- [ ] Ensure no debug code or console.logs (except error logging)
- [ ] Verify all paths are correct

### 2. Git Preparation
- [ ] Commit all changes
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Push to GitHub: `git push origin main --tags`

### 3. Raycast Publish
- [ ] Run: `npm run publish`
- [ ] Follow Raycast CLI prompts
- [ ] Provide store listing information
- [ ] Upload screenshots (if required)
- [ ] Submit for review

### 4. Post-Publication
- [ ] Monitor for approval/feedback
- [ ] Respond to any review comments
- [ ] Announce release (optional)

## Notes

### Dependency Updates Available
- @raycast/api: 1.60.0 → 1.103.7 (consider for v1.1.0)
- @types/node: 20.19.25 → 24.10.1 (consider for v1.1.0)

Note: Current versions are stable and sufficient for v1.0.0 release.

### Known Limitations
- Icon size is very small (25x20px) - may need higher resolution for better display
- OCR only supports Chinese (Simplified/Traditional) and English
- Requires macOS 11.0 or later

### Future Enhancements (v1.1.0+)
- Configurable OCR languages
- Screenshot history
- Multiple output formats (PNG/JPG/WebP)
- Customizable keyboard shortcuts
- Window transparency settings

---

**Release Date**: 2025-11-24
**Version**: 1.0.0
**Status**: Ready for publication ✅
