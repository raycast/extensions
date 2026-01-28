# CodexUsage - Store Submission Checklist

Based on https://developers.raycast.com/basics/prepare-an-extension-for-store

## ✅ Metadata and Configuration (package.json)

- [x] **Author**: `glevdz` - Must match Raycast account username
- [x] **License**: `MIT`
- [x] **Raycast API**: Using `@raycast/api` v1.80.0 (latest)
- [x] **Platforms**: Not restricted (works on Windows, macOS, Linux)
- [x] **package-lock.json**: ✅ Included for CI
- [x] **Third-party terms**: OpenAI Codex CLI - acceptable use
- [x] **Build passes**: `npm run build` succeeds
- [x] **Lint passes**: `npm run lint` passes

## ✅ Naming

- [x] **Extension title**: `CodexUsage` - noun, clear purpose
- [x] **Extension description**: "Track AI usage statistics from Codex CLI" - short, descriptive
- [x] **Command titles**: 
  - `See Usage` - verb + noun pattern
  - `Manage Providers` - verb + noun pattern
- [x] **Command subtitles**: `CodexUsage` - adds context, not duplicative

## ✅ Icon

- [x] **Format**: PNG, 512x512px
- [x] **Location**: `command-icon.png` at root
- [x] **Design**: Custom (white circles on black) - not default Raycast icon
- [x] **Light/Dark**: Works in both themes

## ✅ README.md

- [x] Present at root
- [x] Clear setup instructions
- [x] Command descriptions
- [x] Credits to steipete/CodexBar
- [x] No sensitive data

## ✅ CHANGELOG.md

- [x] Present at root
- [x] Proper format with version headers
- [x] Recent date: 2026-01-27

## ✅ Categories

- [x] `Developer Tools`
- [x] `Productivity`

## ⚠️ Screenshots (Required)

- [ ] Need to add screenshots in `media/` folder
- [ ] 2000x1250 pixels (16:10)
- [ ] PNG format
- [ ] Maximum 6, recommend at least 3
- [ ] Consistent background
- [ ] No sensitive data

## ✅ Code Quality

- [x] No Keychain access
- [x] No external analytics
- [x] No binary dependencies
- [x] US English spelling
- [x] Title Case for categories
- [x] Proper Action Panel titles
- [x] Loading states handled
- [x] Empty states handled

## ✅ Security

- [x] No hardcoded tokens
- [x] No .env files in repo
- [x] Auth tokens read from user filesystem only
- [x] No keychain access requested

## 📋 Before Submitting

1. [ ] Verify Raycast username is `glevdz` (change if different)
2. [ ] Take 3+ screenshots using Raycast's Window Capture
3. [ ] Add screenshots to `media/` folder
4. [ ] Run final build: `npm run build`
5. [ ] Run lint: `npm run lint`
6. [ ] Test on clean Raycast install

## 🚀 Submission Steps

1. Fork https://github.com/raycast/extensions
2. Copy `extensions/codexusage` folder to your fork
3. Create PR with title: "Add CodexUsage extension"
4. Fill PR template
5. Wait for review
