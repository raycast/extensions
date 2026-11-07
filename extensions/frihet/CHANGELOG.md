# Frihet ERP Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Added **Business Brief** (`business-brief`) command with complete vs partial coverage validation, 4-way financial separation (paid revenue, open receivables, overdue exposure, deductible vs non-deductible expenses), and prioritized review items.
- Added **Search Invoices** (`search-invoices`) command with status filter (`all`, `draft`, `sent`, `overdue`, `paid`, `cancelled`), VeriFactu state visibility, line-item detail breakdown, and deep-link navigation to `https://app.frihet.io`.
- Added **Search Clients** (`search-clients`) command with tax ID (`NIF`/`CIF`/`VAT`), contact details, payment terms, and live CRM activity timeline (`GET /v1/clients/:id/activities`).
- Added **Search Products & Catalog** (`search-products`) command with SKU/name search, tax rate & unit price metadata, `isActive` filter (`active`, `inactive`, `all`), and automatic client-side fallback when upstream `GET /v1/products?isActive=...` returns HTTP 5xx.
- Added **Switch Workspace & Cache Reset** (`switch-workspace`) command with tenant fingerprint isolation (`SHA-256` over normalized API base URL + API key) that aborts in-flight requests and purges cached records on workspace rotation.
