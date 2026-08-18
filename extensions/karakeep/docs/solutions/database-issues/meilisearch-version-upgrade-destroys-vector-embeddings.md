---
title: "Deleting Karakeep's Meilisearch volume destroys embeddings, which no reindex restores"
date: 2026-08-12
category: database-issues
module: karakeep-self-hosted-deployment
problem_type: database_issue
component: database
symptoms:
  - Meilisearch container crash-restart loops after a docker-compose image version bump
  - Meilisearch refuses to open a database written by engine 1.13.3 while running engine 1.41.0
  - "Admin 'Reindex all bookmarks' reports success but the vector index stays empty"
  - Semantic search returns nothing while keyword search works because the 1536-dim embeddings index is empty
  - 15 of 913 bookmarks never regain embeddings because their crawl exhausted 6 retries
root_cause: config_error
resolution_type: environment_setup
severity: high
related_components:
  - background_job
  - tooling
tags:
  - meilisearch
  - karakeep
  - docker-compose
  - vector-embeddings
  - data-loss
  - liteque
  - job-queue
  - self-hosted
---

# Deleting Karakeep's Meilisearch volume destroys embeddings, which no reindex restores

> **Where the code lives.** This learning is about the self-hosted Karakeep deployment at
> `/Users/messina/Developer/Docker/karakeep-app/`, which is **not** in this git repository
> (the compose file is untracked and holds live credentials). Source citations marked
> _(container path)_ live inside the running `karakeep-app-web-1` container and are reachable
> only via `docker exec` — they will not resolve on the host filesystem. Line numbers were
> verified against the running container on 2026-08-12 and are specific to that image build.
> Live counts are as of that date on a ~913-bookmark library.

## Problem

A Meilisearch image version bump put `karakeep-app-meilisearch-1` into a crash-restart loop: Meilisearch refuses to open a database written by a different engine version (DB written by 1.13.3, engine 1.41.0).

The volume was then characterized as "derived data, rebuildable." On that basis it was deleted and the stack brought up on v1.53.0 to reindex from scratch.

That characterization was **half right, and the wrong half was the expensive one.** The single Meilisearch instance holds two indexes with completely different provenance:

| Index               | Source of truth          | Restored by admin "Reindex all bookmarks"?     |
| ------------------- | ------------------------ | ---------------------------------------------- |
| `bookmarks`         | Karakeep's SQLite DB     | **Yes** — restored the full library in minutes |
| `bookmarks_vectors` | Embeddings API, 1536-dim | **No** — Reindex touches only full-text data   |

Post-deletion vector count: **1**. Roughly 900 paid embeddings were destroyed.

The two indexes are indistinguishable from outside the container. They live in one volume, are served by one process, and the admin button most people reach for restores only one of them — while reporting success.

## Symptoms

- `karakeep-app-meilisearch-1` in a restart loop after an image bump; logs report the DB was written by a different engine version.
- Semantic search returns nothing while keyword search works fine — the tell that `bookmarks` came back and `bookmarks_vectors` did not.
- Admin "Reindex all bookmarks" reports success while the vector index still holds 1 document.
- Meilisearch is not reachable from the host: port `7700/tcp` is container-internal only, so every diagnostic query has to be issued from inside `karakeep-app-web-1` against `http://meilisearch:7700`. Anything that "checks the index from your laptop" will appear to be down when it is merely unpublished.

## What Didn't Work

**Deleting the volume and reindexing.** This is the action the wrong classification licensed. It recovered `bookmarks` completely and `bookmarks_vectors` not at all. No warning, no partial-restore message, and nothing in the UI distinguishes the two.

**Admin "Reindex all bookmarks" as a recovery mechanism for vectors.** `reindexAllBookmarks` selects bookmark ids and calls `triggerSearchReindex` on each — the full-text path only. It never enqueues an embedding job. Vectors are not in SQLite, so there is nothing for it to read.

**Reaching for a full library re-crawl as the recovery.** This _did_ work — embedding jobs are dispatched off the crawl-success path, so re-crawling the library regenerated the vectors, settling at 898 with zero embedding failures and zero 401s. But it is the sledgehammer, and **it was not necessary** (see Solution): it re-fetches every URL over the network, re-pays for every embedding, and saturates the single headless-Chrome container (`karakeep-app-chrome-1`) with ~913 concurrent crawl jobs. Two bookmarks with perfectly good stored content failed their recrawl for what looks like exactly that contention, and so never got an embedding — the recovery mechanism manufacturing its own new gap.

**Hand-writing job rows into the queue database.** The two stragglers were repaired by inserting rows directly into liteque's `tasks` table. It worked, and it was **reinventing a first-party admin button** that issues the identical payload (see Solution). Kept below only as a fallback and for the queue-schema details, which are genuinely non-obvious.

**Concluding "no embedding job was ever dispatched" from a log grep.** Grepping the container log for each of the 15 ids showed only `[Crawler][<job>:0..5] Will crawl …` and no `[embeddings]` lines. That is correct _for the retained log window_, but it cannot support "ever" — the log only covers the current container lifetime. All 13 still-vectorless bookmarks in fact carry a persisted `bookmarks.embeddingStatus = 'failure'`, a value only the embeddings worker writes, which implies an attempt did run at some earlier point. The operational conclusion (the crawler is upstream and never handed anything off) still holds; the absolute phrasing did not.

## Solution

Three parts: the upgrade that should have happened, the supported repair, and the manual fallback.

### 1. The upgrade that should have been done first

Meilisearch has documented in-place migration paths. Neither requires deleting anything:

- **Engines below 1.51** — `--experimental-dumpless-upgrade`, or env `MEILI_EXPERIMENTAL_DUMPLESS_UPGRADE=true`.
- **1.51 and onward** — `--upgrade-db`.
- **DBs older than v1.12** cannot be upgraded at all; those need a dump/restore, which is still not the same thing as deleting the volume.

Snapshot or copy the volume first regardless. Reaching for either flag on a 1.13.3 database would have made this whole incident a five-minute restart.

### 2. The supported repair: admin → regenerate embeddings

**This is the answer, and it was available the entire time.** The admin router exposes `regenerateAllBookmarkEmbeddings` directly beside `reindexAllBookmarks`, with a button in the admin Background Jobs panel. It takes a `status` filter:

```js
regenerateAllBookmarkEmbeddings: … input(z.object({
  status: z.enum(["failure","pending","all"]).default("all"),
  modifiedWithinSeconds: …optional()
}).optional())
// clearIndex() fires ONLY when status === "all" AND modifiedWithinSeconds is undefined
// then, in batches of 1000:
EmbeddingsQueue.enqueue({ bookmarkId, type: "embed", force: true, runTaggingOnComplete: false },
                        { priority: QueuePriority.Low, groupId: "admin" })
```

_(container path: `/app/apps/web/.next/server/chunks/ssr/_18-l02z._.js`)_

Two things make this the right tool:

- **`status: "failure"` targets exactly the bookmarks whose embedding failed** and skips the `clearIndex()` — so it repairs the gap without destroying the vectors you still have. `status: "all"` with no time window _does_ clear the index first, so reach for `failure` unless you truly want a full rebuild.
- **The enqueued payload is `force: true, runTaggingOnComplete: false`** — identical to what a careful manual repair would write, including leaving hand-curated tags alone.

If the whole vector index is empty after a volume loss, `status: "all"` regenerates the library without re-crawling anything. A full re-crawl is only needed when the _content_ is missing, not the vector.

### 3. Fallback: hand-enqueue a job

Only when the admin path is unavailable. The `embed` handler enqueues the `index` step with no flag gating it — unlike tagging, which sits behind `shouldTag` — at `/app/apps/workers/dist/index.js:87960-87969` _(container path)_:

```js
await EmbeddingsQueue.enqueue(
  { type: "index", bookmarkId, userId: bookmark.userId, embedding },
  { priority: job.priority, groupId: bookmark.userId },
);
if (shouldTag) await enqueueTagging(bookmarkId, bookmark.userId, job.priority, embedding);
```

with `const shouldTag = data$1.runTaggingOnComplete !== false;` at `:87927`. That enqueue is still reachable only past **four early returns** at `:87928-87950` — auto-indexing disabled without `force`, bookmark deleted, no embedding client configured, and `if (!embeddingText)` (no content to embed, which is the guard the 15-bookmark gap actually sits under). `force:true` clears the first; the other three are real preconditions.

The payload contract is enforced by zod at `…/@karakeep/shared-server/src/queues.ts:145-173` _(container path, under `/app/apps/workers/node_modules/.pnpm/`)_:

```ts
export const zEmbeddingsRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("embed"),
    bookmarkId: z.string(),
    force: z.boolean().optional(),
    runTaggingOnComplete: z.boolean().optional().default(true),
  }),
  z.object({ type: z.literal("index"), bookmarkId: z.string(), userId: z.string(), embedding: z.array(z.number()) }),
  z.object({ type: z.literal("delete"), bookmarkId: z.string() }),
]);
export const EmbeddingsQueue = createDeferredQueue<ZEmbeddingsRequest>("embeddings_queue", {
  defaultJobArgs: { numRetries: 3 },
  keepFailedJobs: false,
});
```

#### The queue-table gotcha that will silently eat the job

liteque's `tasks` table (SQLite at `/data/queue.db`, `journal_mode = delete`) uses **different drizzle timestamp modes on two columns of the same table**:

```js
createdAt: integer("createdAt", { mode: "timestamp" }); // SECONDS
availableAt: integer("availableAt", { mode: "timestamp_ms" }); // MILLISECONDS
```

The dequeue query orders by `asc(priority), asc(createdAt)` and filters on `availableAt`, so mixing the units is accepted on write and then corrupts ordering or scheduling — a row that exists and a worker that ignores it. Also: liteque inserts `numRunsLeft` and `maxNumRuns` as a literal `numRetries + 1` (**4** for this queue, per `numRetries: 3` above), `allocationId` is a generated UUID, and `status` defaults to `'pending'`.

```sql
INSERT INTO tasks (queue,payload,createdAt,status,allocationId,numRunsLeft,maxNumRuns,priority,availableAt)
VALUES ('embeddings_queue', '{"type":"embed","bookmarkId":"…","force":true,"runTaggingOnComplete":false}',
        <nowSeconds>, 'pending', <uuid>, 4, 4, 0, <nowMillis>);
```

Run it **inside** `karakeep-app-web-1`, and put the script somewhere under `/app/apps/workers/` — `better-sqlite3` does not resolve from `/tmp`. Remove the script afterward.

**Verified outcome:** both hand-enqueued jobs ran within roughly a minute and logged `Generated embedding … dispatched indexing`, then `Indexed embedding … with 1536 dimensions`, then `Completed successfully`. Vector count moved 898 → 900.

## Why This Works

The re-crawl path regenerates embeddings only as a _side effect_ of crawl success — the crawler fetches, stores content, and the success path dispatches an embed job. That coupling makes the network fetch mandatory even when the content that would be embedded is already sitting in the database. An `embed` job severs the coupling: the handler reads the bookmark, builds embedding text from stored content, calls the embedding client, and enqueues `index` — the crawler is never consulted. That is why it fixes the two failure classes re-crawling could not: bookmarks whose source URL is now unfetchable, and bookmarks whose recrawl lost a race with Chrome contention despite having good content on disk.

`force:true` matters because `enableAutoIndexing` gates the whole handler; without it a job on a config where auto-indexing is off returns immediately and logs at `debug`, indistinguishable from nothing happening. `runTaggingOnComplete:false` matters because the tagger is the one downstream step that writes to hand-curated data — leaving it at its `default(true)` would let a repair job rewrite tags chosen by hand. The admin mutation sets both for you, which is a good sign it is the intended path.

## Prevention

**The headline: "derived data" is a property of a dataset, not of a volume.** Before deleting any volume on the grounds that it is rebuildable, enumerate every logical dataset inside it and answer, per dataset, _what specific process rebuilds this, reading from what specific source of truth?_ If the answer for any one of them is "an external paid API" or "I'm not sure," the volume is not derived data. Two datasets sharing a process, a port, and a restore button share none of their provenance.

**The runner-up, which cost more effort than the data loss did: look for the admin button before building the clever thing.** The repair path here was reverse-engineered out of a minified worker bundle and hand-written as SQL into a job queue — while `regenerateAllBookmarkEmbeddings` sat in the admin panel issuing the identical payload. Reading the admin router's mutation list is cheap and should come before reading the worker.

Concretely, for this stack:

1. **Enumerate the indexes before touching the volume.** From inside the web container, list Meilisearch's indexes and their document counts against `http://meilisearch:7700`. Two indexes appear. Write both counts down — the count diff is what turned "reindex worked!" into "the vectors are gone."
2. **Trace the rebuild path for each one.** `bookmarks` ← SQLite, restored by admin Reindex. `bookmarks_vectors` ← the embeddings API, restored by admin _Regenerate embeddings_ — a **different button**, not Reindex.
3. **Karakeep's SQLite has no embeddings table** — 35 tables, none storing vectors. Be careful grepping for one: the only embedding-shaped column is `bookmarks.embeddingStatus`, a status enum (`success` / `failure` / `pending`), which is _not_ the vector and reads like a hit.
4. **Exhaust in-place upgrade before destructive recovery.** `MEILI_EXPERIMENTAL_DUMPLESS_UPGRADE` below 1.51, `--upgrade-db` from 1.51 on, dump/restore for pre-1.12 DBs. Snapshot the volume first either way. Version-mismatch crash loops are a migration problem, not a corruption problem.
5. **Treat a green "Reindex all" as evidence about one index only.** Re-check the vector count after any reindex. A success toast that covers a subset of your data is a UI lying about its state.
6. **Query the persisted status columns, not just the log.** `bookmarks.embeddingStatus` and `bookmarkLinks.crawlStatus` are durable and queryable; container logs are a rolling window that cannot answer "ever." Both were `failure` for exactly the 13 unresolved bookmarks — a cleaner signal than any grep, and the one that tells you which `status` filter to hand the admin mutation.
7. **Hand-writing a liteque job: check the column mode per column, not per table.** `createdAt` is seconds, `availableAt` is milliseconds, in the same `tasks` table.

## Appendix: the 15-bookmark gap

Recorded because the decomposition is a useful worked example of separating a crawler problem from an embeddings problem.

After the re-crawl, 15 of 913 bookmarks had no vector: 911 links − 898 with `crawlStatus = 'success'` = 13 failed links, plus 2 text notes that have no URL and never enter the crawl pipeline at all.

The 13 link failures broke down as 4 with no extracted content (paywalled or bot-blocked), 1 that fetched only a block page (title literally "Access Denied"), 6 thin JS-only landing pages, and 2 content-rich bookmarks whose recrawl simply failed. Character counts quoted during the investigation were measured on **Meilisearch's indexed `content` field**, not `bookmarkLinks.htmlContent` — for these bookmarks the extracted text lives in a `linkHtmlContent` asset, so the column reads 0 while real content exists. Checking the wrong field here makes a healthy bookmark look empty.

The 2 content-rich failures were repaired by embed jobs; the other 11 need their content fixed first, since there is nothing to embed.

## Related Issues

- [karakeep-app/karakeep#2991](https://github.com/karakeep-app/karakeep/issues/2991) (closed) — same observable surface, an empty vector index, different root cause: Karakeep generates 192-dim vectors (exactly 768/4) reporting `0 tokens` from a provider that returns correct 768-dim vectors, so Meilisearch rejects the write. The issue argues explicitly that the provider is _not_ at fault — it is a response-parsing bug on Karakeep's side. Worth knowing that an empty vector index has more than one cause.
- [karakeep-app/karakeep#346](https://github.com/karakeep-app/karakeep/issues/346) (open) — a repeating `MDB_KEYEXIST: Key/data pair already exists` failure when indexing a bookmark. Adjacent symptom class (Meilisearch indexing failure), not a corrupt data directory.
- `/Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/AGENTS.md:53` — the only other place in this repo documenting the web + meilisearch + chrome Compose coupling. Still accurate; not made stale by this incident.
