# WCAG Testing Guide v2.11 – Separate HTML and PDF export actions

In **Audit Summary**, open **Actions** and choose either **Export HTML Report** or **Export PDF Report**. Each option opens a dedicated form for the chosen format, so no second format selection is required.

The HTML form describes its accessibility advantages; the PDF form explains the tagged-PDF attempt and the fallback to print-ready HTML if the locally installed browser cannot produce a structurally tagged PDF. Both forms retain project, scope, assessor, environment, notes and the optional support-link setting.

The actions are available from both the Audit Summary list entry and the opened Audit Summary detail. No audit storage or report contents were changed.

## Installation

Unzip the project and run `npm ci`, `npm run check`, then `npm run dev` with a compatible Node.js version. Full Raycast/macOS verification remains required before Store submission.
