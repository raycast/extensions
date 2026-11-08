# WCAG Testing Guide: pre-publication checklist

> This checklist records steps to perform; boxes intentionally remain unchecked until tested on the publishing Mac. Passing offline tests is not a substitute for the production build, screen-reader review or PDF validation.

## Packaging and intellectual property

- [ ] Confirm `author` in package.json is the **actual Raycast username**, not an inferred account name.
- [ ] Confirm ownership or redistribution rights to `assets/extension-icon.png` and any source design.
- [ ] Confirm `LICENSE` applies to original materials and `THIRD-PARTY-NOTICES.md` contains the W3C attribution and document license notice.
- [ ] Review user-facing descriptions for factual accuracy and clearly state that WCAG criteria/names belong to W3C.
- [ ] Remove any demo screenshots containing simulated Raycast UI from Store screenshots.
- [ ] Ensure README and changelog describe the actual shipped release, with no stale menu paths.

## Dependency and build checks on macOS

- [ ] Use Node >=22.22.2, preferably Node 24 LTS; verify `node -v`.
- [ ] Upgrade `@raycast/api`, `@raycast/utils`, lint config and ESLint to compatible, supported versions; regenerate and commit `package-lock.json`. Do not edit the manifest without updating the lockfile.
- [ ] Run `npm ci`, `npm run validate-content`, `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` successfully.
- [ ] Run built extension in Raycast, not only `npm run dev`.
- [ ] Capture at least three real Raycast screenshots with the in-app capture tool (2000 x 1250 PNG): criteria, full guide, and audit summary. Use one consistent background.
- [ ] Verify exact extension and command icons in light and dark modes.

## Keyboard and screen-reader acceptance

See [ACCESSIBILITY-TEST-PLAN.md](ACCESSIBILITY-TEST-PLAN.md).

- [ ] Navigate the entire command using keyboard and VoiceOver: search, version selector, review-scope menu, criteria, guide content, status form, Audit Summary and its Manage Audits submenu, export form, About Me and all actions.
- [ ] Confirm meaningful spoken labels for criteria, level and result, correct tab/focus order and no keyboard traps.
- [ ] Verify dialog confirmation and error/success notifications; result forms support text resizing and VoiceOver input.
- [ ] Confirm all external links have meaningful names and no surprise openings.
- [ ] Check the summary begins with the active audit and explains how to record results and manage projects. Confirm results are independent between named audits and WCAG versions; old v2.6 outcomes remain in My First Audit.

## HTML and PDF reports

- [ ] Export a real HTML report with empty, partial and complete audit data, N/A notes, failures, special characters and long text.
- [ ] Test HTML with keyboard and VoiceOver, heading navigation, landmark navigation, data-table navigation, 200% text zoom and 320 CSS px-equivalent viewport.
- [ ] Verify HTML source is offline, escaping is effective, links have meaningful names, and high contrast/status text is preserved.
- [ ] Test CSV injection strings (`=`, `+`, `-`, `@` after whitespace) in notes.
- [ ] Generate a PDF using each supported installed Chromium browser in the user's actual macOS environment.
- [ ] Inspect PDF for tags, document language, title, heading structure, reading order, links, tables and text extraction using a suitable PDF accessibility checker (e.g. Acrobat Accessibility Check or PAC on supported platforms) and a screen reader. A `Tagged: yes` flag alone is insufficient.
- [ ] Check PDF pagination, multilingual text, link focus and selection, and print contrast. Reject obviously untagged PDFs or rely on HTML fallback.
- [ ] If a PDF fails accessibility evaluation, distribute the HTML instead and do not advertise the PDF as accessible.
- [ ] Verify the report footer distinguishes the software developer from the reviewer, uses clearly spaced links, and does not include the voluntary coffee link unless explicitly enabled.

## Final Store submission

- [ ] Review Raycast Store guidelines: https://developers.raycast.com/basics/prepare-an-extension-for-store
- [ ] Check duplicate/overlapping extensions and articulate the unique testing, audit and reporting workflow.
- [ ] Ensure screenshots are not fabricated and do not reveal confidential user data.
- [ ] Run `npm run publish` only after all applicable checks pass; address PR review feedback.
