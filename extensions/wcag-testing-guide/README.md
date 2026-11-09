# WCAG Testing Guide

A free Raycast extension for **manual accessibility testing**. Browse WCAG 2.1 and 2.2, learn practical web and native-mobile checks, record results per project, and export structured reports.

> **Independent testing reference.** This extension does not certify WCAG conformance, replace the normative W3C standards, or determine legal compliance. Test results are entered by the reviewer.

## What it does

- Search success criteria by number, name and accessibility issue, grouped by the four POUR principles. It covers **78 criteria in WCAG 2.1** and **86 in WCAG 2.2** (4.1.1 Parsing is not part of 2.2).
- Read plain-language and technical explanations, suggested implementation approaches, test steps, criterion-specific conditions for Pass, practical web/mobile scenarios and official W3C references.
- Choose **A + AA** for the recommended scope (50 criteria in WCAG 2.1; 55 in WCAG 2.2). Switch to A-only or A + AA + AAA from **Review Scope → Actions → Change Review Scope**. A filter is not a conformance statement.
- Create **separate named audits** for different projects. The original v2.6 results are preserved in **My First Audit**. Each project has independent WCAG 2.1 and 2.2 results. Changing A/AA/AAA does not delete recorded outcomes.
- Mark criteria **Pass, Fail, Not applicable or Not tested**. Evidence notes are optional, including for Not applicable, but recommended for defensible findings. Fail opens an evidence form; reopening a result allows edits.
- See **Audit Summary** with progress, findings, untested criteria and evidence reminders. Export Markdown or CSV; the CSV export neutralizes spreadsheet formula prefixes in user-entered data.
- Export a responsive, self-contained **HTML report** from its own menu action with headings, tables, status text, focusable scrollable tables, links to W3C, keyboard focus styles, and a print stylesheet. It contains no external scripts or hosted assets.
- Request a **tagged PDF** from its own menu action using an installed Chromium-based browser. The exporter checks for basic structure markers and falls back to a print-ready HTML file if the browser fails or produces an untagged PDF. **A tagged file is not automatically PDF/UA conformant**. Manually test PDF structure, reading order, links, language and accessibility before sharing.
- Open **Guide and Support → About Me** for information about developer [Łukasz Krause](https://catsandtests.blog/), the [A11y Audit](https://www.a11y-audit.eu/) accessibility checker, the [Cats & Tests blog](https://catsandtests.blog/), and optional [Buy Me a Coffee](https://buycoffee.to/a11yaudit). Support never blocks functions. Reports distinguish the **developer of this tool** from the **reviewer who performed the audit**; the optional coffee link is **off by default**.

## Getting started

1. In Raycast, start **Explore WCAG Criteria**.
2. Choose WCAG 2.1 or 2.2 from the version dropdown. Confirm the version and level actually required by your project or applicable law.
3. Start at **Audit Summary**. Its **Actions → Manage Audits → Create New Audit…** menu lets you create a separate audit for each product, flow or client. You can switch between saved audits there too. Older results remain in **My First Audit**.
4. Use **Review Scope** to choose A, A + AA or A + AA + AAA, and copy the blank checklist if needed.
5. Find a criterion and read its preview; press Enter for the full guide. Use **Actions → Test Result** to record your observed result. Use keyboard and assistive technologies on the target product, including relevant states and journeys.
6. Open **Audit Summary → Actions → Export HTML Report** or **Export PDF Report**. Each action opens a form for the selected format; add the scope, reviewer and tested environment. The export uses only criteria currently included in your filter.

**Important:** a review progress percentage measures **criteria assessed**, not WCAG conformance. Any untested criterion remains Not tested. Criteria marked Not applicable may need further evidence to justify the decision during a formal review.

## Accessibility of the extension and reports

The interface uses native Raycast List, Detail, Form, ActionPanel and dropdown components with descriptive labels. Result states appear in text as well as icons; the main list, criterion guides and actions are available through standard keyboard navigation. The extension does not open external sites unless selected explicitly.

The detailed-results table reserves sufficient width for full status labels and allows safe wrapping without overlap in print/PDF. On narrow screens it scrolls horizontally with a keyboard-focusable container. A compact, two-column report footer separates software attribution from WCAG source notices, without implying that the tool developer conducted the audit. The assessor is identified separately under Review details. The footer stacks vertically on small screens. The HTML report has a document title, English language declaration, h1–h3 heading order, semantic sections and tables with captions and column headers. It includes a skip link, keyboard-focus indicators, text alternatives to color-coded results, reduced-motion accommodation and local-only assets. Text entered in reports is HTML-escaped and a restrictive Content Security Policy prevents scripts from running.

For PDF output, Chromium is asked to generate tagged PDF and the extension rejects PDFs without detectable structure markers. **This is only a minimum safeguard**; it is not proof of PDF/UA or WCAG compliance. The HTML is the recommended accessible master. Before sharing, check keyboard navigation and screen-reader output in HTML, and reading order, table headers, links and document language in PDF.

## Requirements

Raycast on macOS is required. Choose a WCAG version and testing scope in the required first-run preferences. You can change them later in extension settings.

Automatic PDF export requires a local installation of Google Chrome, Edge, Brave or Chromium. If PDF generation is unavailable, the extension saves an HTML report you can open and print. HTML is the recommended accessible format.

## Privacy

The criteria database is bundled. Audits and free-text evidence are stored locally in Raycast extension storage, separated by named audit and WCAG version. There is no analytics, telemetry, account, remote conversion service or background upload. Reports are saved to your local Downloads folder. Exported reports may contain personal or confidential information **that you typed**, so review them before sending to clients. Opening W3C, Cats & Tests or Buy Me a Coffee links uses your browser and those services have their own privacy policies.

## Scope of normative and legal information

WCAG is a web-content specification. For native iOS and Android apps, [WCAG2ICT](https://www.w3.org/TR/wcag2ict/) provides informative guidance on applying relevant requirements to non-web software; platform rules and applicable legal requirements still matter. The guide includes a short legal orientation for the EU (EAA, WAD, EN 301 549), UK and US (ADA, Section 508), **last reviewed 7 November 2026**. It is not legal advice and may change.

**WCAG AA means meeting applicable A and AA criteria**, not obtaining a percentage score. AAA is an additional scope and is not generally mandated by rules that require A + AA. Check the required edition, exceptions, conforming alternatives, pages, full processes, and actual assistive-technology support.

## Attribution and licensing

Original extension code and original editorial material: **MIT**, © Łukasz Krause. WCAG criterion numbering, names and underlying W3C documents retain their copyright and license. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for the W3C notices and licensing details. This is an independent project, **not affiliated with or endorsed by W3C**.

Official sources: [WCAG 2.1](https://www.w3.org/TR/WCAG21/) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [WCAG2ICT](https://www.w3.org/TR/wcag2ict/) · [W3C document license](https://www.w3.org/copyright/document-license-2023/).
