# Store Submission Template

Use this file to prepare updates for `raycast/extensions` PR review.

## 1) Submission metadata placeholders

- Extension PR: `https://github.com/raycast/extensions/pull/25671`
- Screencast URL: `TODO_ADD_SCREENCAST_URL`
- Reviewer notes summary: `TODO_ADD_REVIEWER_NOTES`

## 2) Screenshot placeholders (you will replace these)

Raycast specs:

- PNG
- 2000 x 1250
- same background for all screenshots

Planned screenshot set:

1. `TODO_SCREENSHOT_01_LIST_RULES.png` — rules list with actions
2. `TODO_SCREENSHOT_02_CREATE_RULE.png` — create rule form
3. `TODO_SCREENSHOT_03_AI_EXTENSION.png` — `@velja-raycast` query flow
4. `TODO_SCREENSHOT_04_BROWSER_PICKER.png` — profile/browser picker
5. `TODO_SCREENSHOT_05_MENU_BAR.png` — menu bar command output

## 3) PR description template

```md
## Description

TODO_ADD_ONE_PARAGRAPH_SUMMARY

## Screencast

TODO_ADD_SCREENCAST_URL

## Checklist

- [x] I read the extension guidelines
- [x] I read the publishing docs
- [x] I ran `npm run build` and tested distribution build in Raycast
- [x] I checked assets usage
- [ ] I added final screenshots
- [ ] I finalized reviewer notes
```

## 4) Final pre-review checks

- `npm run profile:prod`
- `npm run profile:check-upstream`
- `npm run lint`
- `npm run build`
- `npm run test`
- `GITHUB_ACCESS_TOKEN="$(gh auth token)" npm run publish`

After publish/update:

- `npm run profile:dev`
