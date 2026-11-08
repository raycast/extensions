# Accessibility acceptance test plan

This plan covers the WCAG Testing Guide's native Raycast interface and exported HTML/PDF reports. It must be completed manually on representative macOS configurations before declaring any output accessible.

## Native Raycast extension (keyboard and VoiceOver)

1. With VoiceOver enabled, launch **Explore WCAG Criteria** from Raycast using the keyboard. Confirm the command name is descriptive and the icon is not its only identifier.
2. Navigate the list without a mouse. Confirm the search box, WCAG version picker, Audit Summary, its Manage Audits submenu, Review Scope, Guide and Support and criteria are reachable in predictable order.
3. Verify the spoken criterion name, number, level and recorded status, and that status is not conveyed by color alone.
4. Open the full guide and move between Markdown headings. The explanation, test steps, pass condition, status and official link actions should be identifiable without visual context.
5. Create a named audit, switch projects and return. Check that saved results belong to the selected project and WCAG version and that the operation communicates success or failure.
6. Use Actions → Test Result to select Pass, Fail, Not applicable and Not tested. Confirm the selected value, optional notes, save action and errors are announced correctly.
7. Export a report using keyboard and VoiceOver. Check all form labels, optional coffee checkbox and confirmation after saving.
8. Test Raycast at increased macOS text/display sizes where available. Verify no truncation obscures the only way to complete a task.

## HTML export (WCAG 2.2 AA test passes)

- **1.3.1 and 1.3.2:** Check document landmarks, headings and text order. Confirm table captions and headers are programmatically associated with their cells.
- **2.1.1 / 2.1.2:** All links and scrollable table regions are reachable and operable using only a keyboard, without trapping focus.
- **2.4.1 / 2.4.3 / 2.4.7:** Skip link works; focus order is logical; focus indicator remains visible.
- **1.4.3 / 1.4.11:** Check text and non-text contrast at normal/hover/focus states. Colors are never the only representation of result status.
- **1.4.4 / 1.4.10 / 1.4.12:** At 200% zoom, narrow viewport and increased spacing, all content remains readable. Tables may require their own horizontal scrolling where genuinely needed.
- **4.1.2:** Inspect accessibility names/roles and document semantics; test with VoiceOver on Safari and, if available, a second browser/screen-reader combination.
- **Security:** Ensure user-entered HTML is printed as text, no JavaScript runs, and links open only on deliberate selection.

## Tagged PDF export

A PDF tagged by Chromium (or by the separate demo generator) is **not automatically a verified PDF/UA document**. Validate each generated PDF with a suitable analyzer and a screen reader:

- Document language and title metadata.
- Real structure tags for title, headings, paragraphs, lists, tables and links in a logical reading order.
- Full text extraction, correct non-ASCII characters, no missing/clipped content or unjustified blank pages.
- Text contrast, zoom readability, identifiable URL text and active link annotations.
- No informative graphics left without a text equivalent; assessment progress is already presented in text and counts.
- Repeat with lengthy notes and multilingual content, and on a representative macOS browser.

If any necessary requirement cannot be confirmed, send the structured HTML report instead and record the limitation rather than claiming PDF accessibility.

**Test record:** Date: ______ · macOS/Raycast: ______ · Browser: ______ · AT: ______ · Tester: ______ · Defects/issues: ______
