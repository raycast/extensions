# Raycast Store release checklist

## Ready in this repository

- [x] 512×512 PNG extension icon at `assets/icon.png`
- [x] Raycast author, license, category, keywords, macOS platform, command metadata
- [x] Polished controls dashboard, first-run state, audio-rule form, GitHub OAuth command
- [x] `npm run lint` and `npm run build`

## Capture before submission

With `npm run dev` running, open the commands in Raycast and use Raycast Window Capture. Save the screenshots to metadata.

1. **Commit Sound Controls** with two configured sound rules.
2. **Add GitHub Account Rule** form, showing audio-file/link and volume controls.
3. **Connect GitHub Account** confirmation screen.

Raycast supports up to six Store screenshots and recommends at least three. Use only screenshots of the actual extension UI—not mockups—so the Store listing matches the installed experience.

## Submission

1. Commit the extension to a public GitHub repository.
2. Run `npm run lint` and `npm run build` one final time.
3. Submit from Raycast's extension publishing workflow under the `koushik` Raycast account.
4. Complete Store review feedback, if any.

The publishing step is intentionally not automated here because it creates an external Store submission under your account.
