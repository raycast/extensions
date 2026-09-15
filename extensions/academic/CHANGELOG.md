# Academic Changelog

## [Store Review Fixes] - {PR_MERGE_DATE}

- Merge metadata, repository and local results before applying advanced open-access and accepted-file filters.
- Route Advanced Encyclopedia searches exclusively through the configured encyclopedia registry.
- Normalize and validate imported Library records before they reach the user interface.
- Protect the persistent local index with cross-process transactions and atomic file replacement.
- Use Raycast's generated preference types throughout the extension.
- Adopt the current Raycast ESLint flat configuration and add the Documentation category.
- Remove the unused XML parser dependency and stop the local installer from executing a mutable remote Homebrew script.

## [Local Research Library] - {PR_MERGE_DATE}

- Mark summaries, key points, keywords and semantic relationships as experimental, disabled by default behind an explicit opt-in checkbox.
- Keep basic indexing, metadata matching, OCR and strict rename verification available when experimental analysis is disabled.
- Add incremental indexing for multiple local, external-drive and cloud-synced research folders.
- Show indexed local files alongside repository results and open the existing file directly when a searched work is already present.
- Add private extractive summaries, key points, topics, keywords and compact semantic embeddings without requiring an AI service.
- Add optional Ollama detection, structured local-model analysis and local embeddings with deterministic fallback.
- Add optional Raycast AI, OpenAI, Anthropic Claude and Google Gemini analysis behind explicit external-processing consent.
- Add a permanent JSON research index whose path and progress are visible in Config and whose large extracted-text samples and credentials are excluded.
- Add Apple Vision OCR of the first three PDF pages and require exact identifier, OCR title, OCR author and external metadata agreement before any automatic rename.
- Add separate filename templates for articles, books and other works, collision protection, a review queue and rename undo.
- Add small resumable background batches, per-document atomic persistence, battery pause and preservation of temporarily disconnected folders.
- Add related-local-document discovery using quantized semantic vectors.

## [Store Candidate] - {PR_MERGE_DATE}

- Update to Raycast API 2.4.1.
- Search every enabled source independently instead of stopping after a match elsewhere.
- Resolve selected works in DOI, full title-and-author, ISBN, ISSN, PMID and title-only order.
- Check all responsive Anna's Archive and Library Genesis catalog mirrors and retain every confirmed bibliographic record link.
- Keep catalog-only integrations restricted to record pages, without parsing direct file links.
- Add an HTTPS transport fallback for sources affected by intermittent Fetch/TLS resets, including Open Library.
- Replace the repeatedly rate-limited arXiv Atom search with OpenAlex's arXiv repository index while keeping all returned access links on arxiv.org.
- Disable Google Books and Semantic Scholar by default because their anonymous APIs repeatedly return shared-IP rate limits; both remain available when the user supplies an API key.

## [Unified Staged Search] - {PR_MERGE_DATE}

- Reduce the public command list to Search, Library and Config.
- Move selected-text Find and PDF identification into the Search mode selector alongside simple, Advanced and Encyclopedia search.
- Make citation formatting, reference-manager exports and Library actions available directly on every bibliographic result, removing the separate Bib command.
- Split search into a fast metadata stage and a silent concurrent access stage.
- Add Find Sources, which opens a dedicated work screen, reuses preliminary access results and continues a targeted DOI, ISBN or title-and-author lookup.
- Keep repository, catalog, institutional and marketplace links out of the initial bibliographic list so slower sources do not delay useful metadata.

## [Optional Source Errors] - {PR_MERGE_DATE}

- Hide unavailable-provider entries by default so searches show only found works and sources.
- Add an opt-in “Show unavailable sources” setting to Config and native Raycast preferences.

## [Advanced Search Fix and Simplified Configuration] - {PR_MERGE_DATE}

- Fix advanced partial-title matching so a query such as “Modal Logic” matches a longer article title; exact-title matching is now opt-in.
- Add the same advanced-search form to Bib.
- Replace the single long Config form with separate navigable pages for each settings area.
- Reduce native Raycast preferences from 186 entries to basic source-category and behavior controls.
- Enable only basic book, article and metadata categories by default; encyclopedias, countries and marketplaces start disabled.
- Make country selection automatically enable or disable every marketplace configured for that country.

## [Unified Commands and Source Roles] - {PR_MERGE_DATE}

- Reduce the public command list to Search, Bib, Find, Library and Config.
- Combine simple, advanced and encyclopedia modes inside Search; combine clipboard/text and PDF identification inside Find.
- Add named libraries with choose-on-save, creation, movement, deletion and round-trip Academic JSON import/export.
- Add a Save to Library action to ordinary, advanced, encyclopedia, PDF/clipboard and bibliography results.
- Separate access/discovery providers from metadata/bibliography providers and add optional Amazon product-page metadata lookup by Amazon URL or ISBN.
- Add regional marketplace controls, later simplified so each selected country enables its configured marketplaces automatically.
- Mirror all non-secret Config choices in native Raycast preferences with per-field synchronization.
- Include catalog-only shadow-library lookup in both book and article searches while continuing to expose record pages only.

## [Academic Research Workspace] - {PR_MERGE_DATE}

- Rename the extension to Academic and add eight focused research commands.
- Add advanced fielded search for title, authors, work type, publisher, journal, year, DOI, ISBN, ISSN, language and access.
- Replace order-dependent record merging with work and edition clustering across sources.
- Add a checkbox-based configuration command for book, article and encyclopedia sources, languages, countries, marketplaces and accepted file formats.
- Add a separate scholarly encyclopedia search for SEP, IEP, Encyclopedia of Mathematics, NCBI Bookshelf, Scholarpedia and Encyclopedia of Life.
- Add regional marketplace searches across North America, South America, Europe, Asia, Africa and Oceania.
- Add clipboard resolution, local PDF identification, saved works, collections, tags and recent search history.
- Add CSL JSON, Markdown, LaTeX and Pandoc citation exports alongside ABNT, APA, Chicago, MLA, BibTeX and RIS/Zotero.
- Add institutional OpenURL lookup, scholarly-relation actions, version, license, language, confidence and retraction metadata.
- Add a five-minute result cache and strict relevance filtering.

## [Faster Search and Consolidated Works] - {PR_MERGE_DATE}

- Stream results into Raycast as each source responds instead of waiting for every provider.
- Limit each federated search to ten results per source and stop pending providers after ten seconds.
- Consolidate title, author, DOI and ISBN variants into a single work.
- Display every repository and access link under the consolidated work details.

## [Initial Release] - {PR_MERGE_DATE}

- Search books and scholarly works by title, author, DOI, ISBN or ISSN.
- Combine metadata, covers and access options from open scholarly and public-domain sources.
- Add Semantic Scholar, CORE and Zenodo providers.
- Offer a browser-based Google Scholar search without automated scraping.
- Format references as ABNT, APA, Chicago and MLA.
- Export references as BibTeX and RIS, including direct RIS import into Zotero.
- Support optional catalog-only mirror lookups that expose bibliographic record pages, never direct file URLs.
