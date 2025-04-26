## Stack

---

- Vercel, using the pages app - Client and server
- Inngest - background jobs
- Supabase - database, for storing user data and translation data

## Constraints

---

### Inngest

- Number of runs used, [limit for the free plan is 50k](https://www.inngest.com/pricing)

### Vercel

- [13.3 minutes function execution duration](https://vercel.com/docs/functions/configuring-functions/duration#duration-limits)
- [4.5mb request body size](https://vercel.com/docs/functions/limitations#request-body-size)

### Notion

- 3 requests per second
- [100 elements per block (paragraph)](https://developers.notion.com/reference/request-limits#limits-for-property-values)
- [2,000 characters per rich text object (element in paragraph)](https://developers.notion.com/reference/request-limits#limits-for-property-values)

## Optimisations

---

### Google Translate

- Translate as much content as possible in each request e.g. as many blocks from a page as possible or all database properties (increases the risk of errors)
- Every input is an array of text

## Design

---

### Supabase

- Store the IDs of all blocks that have been counted in Supabase, along with their from and to language, type, ~~block_count (for databases),~~ has_child_blocks (for pages), parent_id, ignore (used when user has changed app’s access or set manually, when requested) and their status.
  - Statuses are pending, complete, error
  - Types are database, database_page (for page titles and properties), page (for page titles) and page_block
- Retrieve those blocks in batches and keep processing them until all translations have been made
- If a user requests a new translation, blocks that have already been translated, with the same from - to languages, should not be translated again
- _There’s no need to link blocks to a translation job. Each request can simply fetch pending translations_

### App

- Display a count of blocks counted vs blocks limit (from credits), on the dashboard
- Display a count of blocks to translate vs translated blocks, on the dashboard

## Process

---

All block inserts / updates are `upsert` requests

- Fetch databases from workspace
  - Database title = 1 block
  - Each property (including drop down properties) = 1 block
- Check whether blocks have already been translated, then store database and property blocks in Supabase
- Fetch pages from the workspace, in batches of 100.
  - Page title = 1 block
  - Each property’s contents = 1 block
- Check whether page has block children (with `page_size = 1`, to speed up the request)
- Check whether blocks have already been translated, then store page and property blocks in Supabase
- For pages with block children, fetch the number of blocks from each of those pages, in batches of 10
- Check whether blocks have already been translated, then store blocks in Supabase

- Translate the database title and its properties, including dropdown options, in one go
