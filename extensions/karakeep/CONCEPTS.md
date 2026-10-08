# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Content and enrichment

### Bookmark
The single saved item this system is built around. A Bookmark is not necessarily a link — it may be a saved URL, a plain-text note, or an uploaded asset, and the type determines which enrichment steps apply to it. A text note has no source to fetch and so never enters the crawl pipeline at all.

### Crawl
The pass that fetches a Bookmark's source URL, renders it, and extracts its readable content into stored fields.

A Crawl's **success is the dispatch point for downstream enrichment** — embedding and tagging are triggered by a completed Crawl, not by the presence of content. A Bookmark can therefore hold good extracted content from an earlier Crawl and still be missing its enrichment, if a later Crawl failed. Crawls retry a fixed number of times and then stop. The failure is durably recorded as the Bookmark's crawl status, so it is queryable after the fact — but no downstream enrichment is dispatched and nothing announces it, so the practical symptom is a Bookmark that quietly never gains an Embedding.

### Embedding
The vector representation of a Bookmark's extracted text, produced by an external model and used to answer semantic queries.

An Embedding is **stored only in the search engine, never in the primary database** — though the text it is computed from is held locally, so regenerating one needs no network fetch, only a fresh paid call to the external model. This is the most consequential asymmetry in the system: full-text search data can be rebuilt from the primary database for free, while Embeddings must be re-purchased. Deleting search-engine storage is therefore destructive to Embeddings and merely inconvenient for everything else.

### Reindex
The administrative operation that rebuilds search data for the whole library from the primary database.

Reindex covers **full-text data only**. It does not regenerate Embeddings, and it reports success on completion regardless — so a green Reindex is evidence about one half of the search data and says nothing about the other. Restoring Embeddings is a **separate administrative operation** that re-runs enrichment per Bookmark, and it can be scoped to only those whose embedding previously failed.

## Flagged ambiguities

- "Rebuildable" had been applied to search storage as a whole. It is a property of an individual dataset, not of the storage that holds them: full-text data is rebuildable, Embeddings are not, and both live in the same place.
