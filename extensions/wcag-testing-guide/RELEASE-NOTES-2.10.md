# WCAG Testing Guide v2.10 — report credit and copyright polish

The HTML and PDF report footer now uses a professional, compact format.

- **About the reporting software** credits WCAG Testing Guide developer Łukasz Krause, and links to A11y Audit and Cats & Tests.
- **Report information and WCAG references** describes how results are recorded and links to the official W3C specification and document license.
- The footer explicitly says software credits are separate from audit authorship. **Review details → Assessment performed by** identifies the reviewer, if supplied.
- Correct W3C source copyright date ranges are selected for WCAG 2.1 versus 2.2.
- The support link appears only if a reviewer opts into including it in the report.
- Footer panels stack on small screens and display side by side in the print/PDF layout.

## Release validation

Run `npm run validate-content && npm test`. On macOS also run `npm ci && npm run check && npm run dev`. Review exported HTML with keyboard and screen reader, and PDF with a PDF/UA validator and assistive technology before making accessibility claims. `Tagged: yes` alone is not proof of PDF/UA conformance.
