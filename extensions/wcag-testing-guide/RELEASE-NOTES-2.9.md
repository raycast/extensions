# WCAG Testing Guide v2.9 — clearer audit workflow and report credits

## Raycast navigation

- **Audit Summary** is the first item. The redundant **Current Audit** item has been removed.
- The summary shows which named audit is active, how to record results, and where to export.
- Use **Audit Summary → Actions → Manage Audits** to create, switch, or delete named audits. Result storage is unchanged.

## HTML and PDF

- The **Review details** section names the **person/team who performed the audit** (if provided).
- The footer clearly identifies **Łukasz Krause as the developer of WCAG Testing Guide**, not automatically the person who performed the audit. These may be the same person in a particular case, but are separate roles.
- A11y Audit and Cats & Tests appear in their own spaced, semantic list. W3C source and licensing information appears in a separate section.
- The optional Buy Me a Coffee link remains off by default.

## Validation

- Run `npm run validate-content && npm test` for bundled offline checks.
- Run `npm ci && npm run check && npm run dev` on macOS before Store submission.
- Verify the exported HTML with VoiceOver and the PDF with a structural validator and screen reader. Tagged output alone is insufficient to claim PDF/UA conformance.
