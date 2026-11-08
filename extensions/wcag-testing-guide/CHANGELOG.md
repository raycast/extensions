# WCAG Testing Guide Changelog

## [Unreleased] - v2.11 report export actions (7 November 2026)

- Split Audit Summary export menu into **Export HTML Report** and **Export PDF Report**, available both from the summary row and its detail screen.
- Each action opens a dedicated, clearly named export form with one submit action and format-specific accessibility guidance.
- Kept the existing project metadata, local file output, and PDF-to-print-ready-HTML fallback.

## 2.10 — professional report credits (7 November 2026)

- Reworked HTML/PDF report footnotes into two clean, clearly identified columns: **About the reporting software** and **Report information and WCAG references**.
- Made the tool developer attribution concise and neutral, without implying that the developer performed the audit.
- Kept the audit assessor in **Review details → Assessment performed by** and linked to it from the software credit.
- Improved spacing, mobile stacking and print layout of the credits and project links.
- Corrected the W3C copyright year range for WCAG 2.1 (2020–2025) and WCAG 2.2 (2020–2024), with a link to the W3C Document License.
- Kept Buy Me a Coffee optional and hidden in reports by default.

## [Unreleased] - v2.9 release candidate

- Start the audit area with Audit Summary; remove the separate Current Audit row without removing named-audit management.
- Put Create, Switch and Delete Audit actions under Audit Summary → Actions → Manage Audits.
- Explain the active audit, recording results, managing audits and exports at the top of the summary.
- Distinguish the person who developed WCAG Testing Guide from the audit reviewer in HTML/PDF reports.
- Give links their own semantic, spaced list and separate tool credits from W3C standards attribution.
- Rename the reviewer field to Audit performed by in forms and reports; add regression tests.

## [Previous improvements] - v2.8 release candidate

- Fix overlapping status labels and notes in HTML/PDF detailed-results tables, including the long “Not applicable” label.
- Increase the status column width, allow safe label wrapping, and keep tables horizontally scrollable on narrow screens.
- Introduce A11y Audit in About Me and add a dedicated menu action, alongside Cats & Tests and optional support.
- Add A11y Audit attribution/link to the optional author information in exported reports.
- Add layout regression assertions and refresh printable sample reports.

## [Initial Release] - {PR_MERGE_DATE}

- Browse all applicable WCAG 2.1/2.2 success criteria with clear technical explanations, manual checks, implementation ideas, pass conditions and official W3C references.
- Include web and native-mobile scenarios, WCAG2ICT context, version-aware A + AA filtering and optional AAA criteria.
- Record Pass, Fail, Not applicable and Not tested outcomes in separate named local audits; preserve previous single-audit data under My First Audit.
- Track failures and review progress, and export Markdown, spreadsheet-safe CSV and accessible-structured HTML reports.
- Request a tagged PDF using local Chromium; if PDF structure tags cannot be detected, fall back to print-ready HTML. PDF/UA conformance requires further verification.
- Provide HTML output with semantic headings, table captions and headers, skip navigation, readable status text, focus indicators and no remote scripts.
- Offer a separate About Me page with blog and voluntary support links; no donation prompt is required to use the guide.
- Document the W3C source/license notices, privacy practices, accessibility checks and limitations of conformance claims.
