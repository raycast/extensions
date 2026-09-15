# Academic

Academic turns Raycast into a unified workspace for scholarly discovery and personal research management. Search for a book, article or reference work by title, author, DOI, ISBN or ISSN, then review consolidated metadata, covers, abstracts, editions and citations without treating every provider record as a separate work.

The extension searches enabled scholarly databases, open repositories, library catalogs and reference sources concurrently. A fast bibliographic stage presents useful results first; source discovery continues in the background and collects every confirmed repository, catalog, institutional-access and marketplace link under the selected work. Search can switch between simple, advanced, encyclopedia, selected-text and PDF-identification modes from a single command.

Academic also connects discovery to the researcher's own library. Works can be organized into named collections, exported in common citation formats and matched against documents stored in local, external-drive or cloud-synced folders. Progressive indexing extracts identifiers and metadata, uses Apple Vision OCR to verify document identity and never renames a file automatically unless DOI or ISBN, bibliographic metadata, OCR title and OCR author independently agree. Optional summaries and semantic relationships are clearly marked experimental, disabled by default and can run privately on-device.

## Commands

- **Search** — one mode selector for simple search, Advanced, Encyclopedia, selected-text Find and PDF identification. Every bibliographic result includes citation, export, Library and source-discovery actions.
- **Library** — named research libraries, saved works, tags, recent searches, movement between libraries and Academic JSON import/export.
- **Config** — opens separate pages for book sources, article sources, catalog-only sources, metadata, encyclopedias, languages, countries, file formats and behavior.
- **Index** — incrementally inventories and analyzes configured local, external-drive and cloud-synced research folders. It can continue in small background batches after the user activates background refresh.

## Two-stage Search

Academic separates bibliographic discovery from access discovery:

1. Metadata providers stream titles, authors, covers, abstracts, identifiers and citation data into the first result list.
2. Access providers search silently in parallel for the original query while the user reviews those records.
3. **Find Sources** opens a dedicated screen for the selected work, immediately merges any access results already found and continues an ordered DOI, full title-and-author, ISBN, ISSN, PMID and title-only search.
4. Every enabled provider is queried independently. A match in one source never stops the remaining sources, and all confirmed links are consolidated under the selected work.

This avoids holding the first useful results behind slower repositories. Repository, catalog, institutional and marketplace links appear only in the source screen; citations and Save to Library remain available from the initial bibliographic record.

## Consolidated Results

Academic models each result as a work with editions and source links:

```text
Work
  Editions and translations
    Accepted files
    Repository records
  Institutional access
  Marketplace searches
```

DOI, PMID, ISBN, provider work identifiers, normalized titles and author identities are used for clustering. Advanced searches are post-validated locally, preventing a broad provider from returning an article that merely cites a requested book.

## Configurable Sources

API-backed sources include Open Library, Crossref, OpenAlex, Europe PMC, Internet Archive, arXiv, DOAJ, PubMed Central, Project Gutenberg, Semantic Scholar, CORE, Zenodo, Unpaywall and Google Books.

Configurable external catalog searches include Google Scholar, PhilPapers, SSRN, RePEc/IDEAS, DOAB, OAPEN, HathiTrust and WorldCat. These open a query in the browser and are not scraped.

Optional catalog mirrors expose matching bibliographic record pages only. Every responsive mirror is checked and every confirmed record link is retained; the adapters never parse or expose direct file/download URLs.

Access and metadata are independent roles. A provider can be used to locate the work without being allowed to enrich its displayed bibliography, or vice versa. Amazon Product Page metadata is optional and is resolved only from a pasted Amazon product URL or a valid ISBN; marketplace links remain independently selectable.

## Encyclopedias

The Encyclopedia mode inside Search supports:

- Stanford Encyclopedia of Philosophy
- Internet Encyclopedia of Philosophy
- Encyclopedia of Mathematics
- NCBI Bookshelf
- Scholarpedia
- Encyclopedia of Life

Sources without a stable API fall back to their official browser search.

## Languages, Countries and Formats

The configuration includes languages used in academic research and countries across North America, South America, Europe, Asia, Africa and Oceania. Selecting a country automatically enables all marketplaces configured for it; deselecting the country removes those marketplace links. No country or marketplace is enabled by default.

Accepted file checkboxes include PDF, TeX/LaTeX, DOC/DOCX, TXT, EPUB, HTML, DjVu, RTF, XML/JATS, MOBI/AZW and unknown formats. File filters do not hide repository record pages, library links or marketplace searches.

## Credentials and Institutional Access

Native Raycast preferences contain only the basic book, article, metadata and encyclopedia category switches plus general behavior. Detailed source, language, country and format choices live in the separate pages inside Config, reducing the native settings screen from hundreds of checkboxes to a small set of controls.

Raycast extension preferences hold optional credentials in protected preference storage. Google Books and Semantic Scholar are disabled by default because their reliable API access requires a key:

- Contact email for polite API pools and Unpaywall
- Google Books API key
- Semantic Scholar API key
- CORE API key
- Institutional OpenURL resolver base URL
- Optional OpenAI, Anthropic Claude and Google Gemini API keys and model identifiers

No account or server is required for the local library. Every Search mode lets the user choose or create a named library. Library can create, move, remove, import and copy round-trip JSON exports. Saved works, libraries, tags, settings, history and the five-minute result cache stay on the device.

## Local Documents, OCR and Safe Renaming

Config can monitor multiple local, external-drive or cloud-synced folders. Indexing is progressive: Academic inventories every supported file first so filename and path search work immediately, then processes a small resumable batch. Unchanged files are identified by a lightweight fingerprint and are not reprocessed. Disconnected folders are preserved in the index rather than interpreted as deletions.

For PDFs, Apple Vision performs an independent OCR pass over the first three pages. Automatic renaming is impossible unless all of these checks pass:

1. A DOI or ISBN extracted from the file exactly matches a configured bibliographic metadata source.
2. The title recognized independently by OCR agrees with that bibliographic record.
3. At least one OCR-recognized author agrees with the record.
4. No strong identifier contradicts the selected record.

A DOI, filename or embedded PDF metadata alone can never authorize a rename. If any check is missing or contradictory, Academic keeps the original filename and marks the document for review. Existing destination files are never overwritten, and successful renames can be undone from Library.

The permanent, machine-readable index always contains bibliographic data and short OCR evidence. When the experimental analysis feature is explicitly enabled, it can also contain summaries, key points, topics, keywords and compact embeddings. Large extracted-text samples and API keys are never written to it. Config displays its exact path and current completion percentage so other local research tools can consume the continuously updated JSON file.

## Experimental Analysis Engines and Privacy

Experimental analysis is disabled by default and must be enabled with its own checkbox in Config or Raycast Settings. Basic folder indexing, DOI/ISBN detection, first-page OCR, bibliographic identification and strict rename verification do not depend on this experiment.

When enabled, Academic supports four execution paths behind a common structured-result interface:

- **Local Basic** — private extractive summaries, keywords and deterministic compact embeddings; no model installation or network submission.
- **Ollama** — detects an Ollama-compatible server and its installed models, requests schema-constrained summaries and uses a configured embedding model. The default URL is localhost.
- **Raycast AI** — available only when Raycast reports that the user can access its AI API.
- **External APIs** — optional OpenAI, Anthropic Claude or Google Gemini credentials stored as protected Raycast password preferences.

External document processing has a second, independent consent checkbox and is also disabled by default. Without consent, a remote engine silently falls back to Local Basic. A non-local Ollama URL is treated as an external service and requires the same consent. Only a bounded excerpt is submitted; document identity and rename authorization remain independent of every generative model.

Semantic relationships are computed over short document cards rather than full files. Ollama embeddings are quantized before storage; if Ollama or its embedding model is unavailable, Academic creates a smaller deterministic local embedding so related-document discovery remains functional.

Background runs pause on battery by default, process only a configurable small batch, save after every document and resume on the next run. Academic never depends on one long-running process to keep the index consistent.

## Local Installation

```bash
./check-requirements.sh
./install-local.sh
```

The installer checks Raycast, Node.js 22.22.2+, npm and required macOS development tools, installs project dependencies, builds the extension and starts local Raycast development mode.

## Development and Verification

```bash
npm install
npm run sync:preferences
npm run typecheck
npm run test:merge
npm run test:processing
npm run test:local-library
npm run test:encyclopedias
npm run test:sources
npm run build
```

Live source tests can be affected by provider downtime, anonymous rate limits or missing optional API keys. Each provider fails independently in the application.

## Adding or Removing Sources

Provider adapters live in `src/providers/`. User-visible source definitions, languages, countries, marketplaces and formats live in `src/config/catalog.ts`. Register API providers in `src/providers/index.ts`; register encyclopedia providers in `src/providers/encyclopedias.ts`.

Catalog mirror domains remain isolated in `src/providers/catalog-mirrors/config.ts`. Do not add direct download parsing to catalog-only adapters.

Document indexing lives in `src/local-library/`. `analysis.ts` contains the Ollama, Raycast AI and optional external-provider adapters; `local-analysis.ts` is the dependency-free fallback; `validation.ts` is the mandatory rename safety gate. New analysis engines must return the same structured fields and must never bypass `validateRenameCandidate`.

## Responsible Use

Academic does not bypass authentication, paywalls, DRM, CAPTCHA or access controls. Users should verify a work's license and each source's terms before reading, downloading or purchasing it.
