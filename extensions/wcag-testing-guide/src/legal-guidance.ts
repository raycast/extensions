/** Short, referenced legal orientation. Keep this in sync across both guide screens. */
export const legalReviewDate = "7 November 2026";

export function internationalRequirementsMarkdown(): string {
  return [
    "## Accessibility requirements around the world",
    "",
    "**International:** WCAG is a W3C technical standard used worldwide, not a global law. **A + AA** is a common testing target, but legal requirements depend on the product, country and referenced version.",
    "",
    "**European Union (EAA and WAD):** The **Web Accessibility Directive (WAD)** covers public-sector websites and apps. The **European Accessibility Act (EAA)** has applied since **28 June 2025** to specified products and services, including e-commerce, banking and passenger transport, subject to national laws and exemptions. **EN 301 549 v3.2.1** (based on WCAG 2.1) remains the EU harmonised reference; **EN 301 549 v4.1.1** (based on WCAG 2.2) was published in September 2026 but is **not yet harmonised**. EN 301 549 also includes requirements beyond WCAG.",
    "",
    "**United Kingdom:** Public-sector websites and apps generally target **WCAG 2.2 AA** under the 2018 Accessibility Regulations. The **Equality Act 2010** requires reasonable adjustments by service providers in Great Britain; different disability legislation applies in Northern Ireland. There is no blanket statutory WCAG 2.2 rule for every private website.",
    "",
    "**United States:** **ADA Title II** specifies **WCAG 2.1 AA** for state and local government websites and apps, with compliance deadlines extended to **26 April 2027 or 2028**, depending on the entity. Federal **Section 508** incorporates **WCAG 2.0 A + AA**, with exceptions. **ADA Title III** also covers businesses open to the public, but does not prescribe one WCAG version for every private site.",
    "",
    "**A filter is not a conformance claim.** Check all applicable criteria for the required version and level across complete pages, processes and states. Start at **Not tested**, collect evidence, and explain any valid **Not applicable** decision or permitted exception.",
    "",
    "**Official sources:** [EU EAA](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en) · [EU EN 301 549 update](https://accessible-eu-centre.ec.europa.eu/content-corner/news/european-accessibility-standard-en-301-549-has-been-updated-2026-09-07_en) · [UK accessibility guidance](https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps) · [US ADA Title II](https://www.ada.gov/resources/small-entity-compliance-guide/) · [US ADA Title III](https://www.ada.gov/resources/web-guidance/) · [US Section 508](https://www.access-board.gov/ict/)",
  ].join("\n");
}

export function regulatoryReviewFooter(): string {
  return `*Regulatory information last checked: ${legalReviewDate}. Check the latest local rules before assessing a product. This is guidance, not legal advice.*`;
}
