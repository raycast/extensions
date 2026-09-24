---
name: notion-knowledge-capture
description: Use when a user wants to organize supplied knowledge into Notion, find a related page, or append a concise sourced summary to an existing page.
---

# Knowledge capture

## When to use

Use to capture supplied notes, ideas, or research in a Notion database or page.
Draft the content first; save when the user asks to create or append it.
Use only this extension's tools named below.

## Workflow

1. Identify the material to capture, its source links, and the intended destination.
   Separate source facts from the user's ideas and open questions.
   Ask for missing source content instead of claiming to read a link with these tools.
2. Call `search-pages` with a short plain-text `searchText` to find related pages.
   This searches titles, not all page text. Do not use search operators.
   If a database is the destination, call `get-databases` to resolve its name and ID,
   then `search-database` with `databaseId` and a plain-text `query` for likely matches.
3. Call `get-page` with `pageId` for relevant candidates before deciding to append
   or create. The response contains the first page of top-level blocks; nested blocks
   and additional pages are not fully fetched. Disclose this limit when it matters.
4. Propose a concise title and structured content: summary, key facts, implications,
   open questions, and sources. Preserve useful dates and attribution from the material.
   Use Markdown supported by the tools, such as headings, lists, and code blocks.
5. If a matching page exists, prefer proposing an append to the selected page.
   Clarify an ambiguous page or database before writing. An empty title search
   is not proof that the knowledge has never been captured elsewhere.
6. For a requested new page, call `create-page` with the resolved `databaseId`,
   `title`, and `contentMarkdown`. For a requested append, call `add-to-page`
   with `pageId` and `contentMarkdown`. Check readable existing content for duplicates
   before appending and preserve the original page's content.
7. Inspect the write response and call `get-page` where it can verify the content.
   A section beyond the readable block limit may not be independently verifiable;
   distinguish a successful write response from a complete read-back verification.
   Inspect current state before retrying an uncertain creation or append.

## Output

- Proposed title, summary, key facts, open questions, and source links.
- Selected destination and related pages considered.
- Confirmed creation or append with a returned page link when available.
- Duplicate-search limits, unread blocks, and any unverified save outcome.

## Do not

- Do not invent sources, page IDs, database properties, or facts absent from the material.
- Do not claim full-text search or complete nested-page retrieval with these tools.
- Do not replace page content or alter database properties as part of capture.
