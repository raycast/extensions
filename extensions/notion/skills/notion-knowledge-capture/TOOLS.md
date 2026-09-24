# Existing Notion AI tools

Reviewed against `package.json` and all six files in `src/tools/` on September 24, 2026. The extension registers six tools with nine top-level inputs; all inputs are required. The database, page, mapping, Markdown conversion, and OAuth helpers were also inspected.

| Tool | Inputs |
| --- | --- |
| [search-pages](../../src/tools/search-pages.ts) | `searchText: string` |
| [get-page](../../src/tools/get-page.ts) | `pageId: string` |
| [add-to-page](../../src/tools/add-to-page.ts) | `pageId: string`; `content: string` |
| [create-page](../../src/tools/create-page.ts) | `databaseId: string`; `title: string`; `content: string` |
| [get-databases](../../src/tools/get-databases.ts) | None |
| [search-database](../../src/tools/search-database.ts) | `databaseId: string`; `query: string` |

## Discovery and identifiers

- `search-pages` calls Notion search with plain title text, descending last-edited order, and batches of 100. It continues while the accumulated result count is below 250, keeping the whole final batch, so the threshold can be exceeded. It returns only ID, mapped title, URL, parent database ID, and parent page ID. It drops continuation, object type, last-edited time, and properties. It is not full-text search and accepts no operators, filters, dates, or cursor.
- The underlying search has no object filter, so `search-pages` can include data sources as well as pages despite its name. Do not treat every result ID as a page. Parent database/container IDs are not necessarily the data-source IDs expected by a database query. The mapper also keeps only the first title rich-text fragment, so displayed names may be incomplete.
- `get-databases` actually searches for data-source objects, sorts by last edit, and returns their IDs, first title fragment, last-edited time, and icon fields. It makes one request, drops pagination, and returns no schema, properties, container IDs, or URLs. Errors are shown as a toast and return `[]`, so an empty result cannot distinguish an unavailable discovery call from no visible data sources.
- Database helpers first try the supplied ID as a data source. If that fails, they retrieve it as a database container and use its first data source; if both lookups fail, they pass through the original ID. The skill uses an explicitly selected discovery ID to avoid silently writing into the first source of an ambiguous container.
- `search-database` queries a resolved data source with `page_size: 20`, descending last-edited order, and a title-contains filter when `query` is nonempty. An empty string lists the first recent rows without a title filter. It returns mapped page metadata/properties, not page content, and drops totals/continuation. Errors become `[]`. There is no schema reader or optional sorting/filter input on the tool.
- Page metadata can include URLs. Data-source discovery does not. Prefer returned or user-supplied URLs; a verified page/container UUID can form a standard Notion page link, but a data-source ID must not be assumed to be a browser destination. A mapped parent container ID is distinct from the source ID; it does not establish membership in a particular source by itself.

## Content reader

- `get-page` calls `notion.blocks.children.list` with `block_id: pageId` and `page_size: 100`. It returns `{ status: "success", content: JSON.stringify(results) }`, not Markdown. Empty results return `{ status: "empty", content: "Page is empty" }`; exceptions return `{ status: "error", content: JSON.stringify(err) }`. Inspect status before parsing or using content.
- Only the first batch of direct children is returned. The tool discards `has_more` and `next_cursor` and exposes no cursor input. A full batch is a clear coverage concern, and the absence of continuation metadata is not proof of completeness.
- Returned blocks can expose `has_children` and their own IDs. Because the implementation forwards the argument directly to the block-children endpoint, the same `get-page` call with a returned block ID in `pageId` can read that block's children. This is a repeated use of the existing reader, not a new tool. Traverse relevant nested blocks within the requested scope and disclose unread branches/siblings. A linked external document is not block content and cannot be fetched with this reader.
- The reader does not retrieve page properties, permissions, database schemas, or source document URLs. Preserve metadata from discovery and supplied links for citations. An inaccessible page is not an empty page. Existing eval mocks that show Markdown do not override the current tool's JSON/status implementation.

## Writes and verification

- `create-page` accepts only database ID, title, and Markdown content. The helper resolves a data source, sets `parent.data_source_id`, converts Markdown to blocks, and sets the title property through its existing property converter. Other properties supported by the UI helper are not exposed by the AI tool. The result is mapped page metadata, including ID and URL when supplied by Notion; errors throw `Failed to create page` with a cause.
- Creation has a Raycast tool confirmation showing title, content, and a retrieved database/data-source name when available. The manifest separately requires the database name when creating a page. Resolve the destination and exact body before invoking the tool; do not silently choose a default wiki or create a database because no destination was specified.
- `add-to-page` appends converted Markdown blocks to the end of the target. There is no prepend, replace, block-update, date-divider, or property input. Its Raycast confirmation shows the proposed content. The result is a Markdown conversion of returned blocks, with no structured success field, page ID, or URL.
- Appending performs the remote write before converting its response with `notion-to-md`. A conversion failure can therefore follow a successful append. Errors are shown as a toast and return `{ markdown: "" }`; that value is not proof that the write failed. A nonempty but unusable conversion also does not establish exact content. Inspect with `get-page` before retrying, and preserve the verified target ID/URL independently of this receipt.
- Readback cannot reach appended siblings beyond the reader's first batch. When no available tool can resolve an uncertain write, report the uncertainty and stop automatic retries. Search is bounded and may be delayed, so an absent new title does not prove creation failed either. Neither write exposes an idempotency key or rollback.
- Both helpers send converted blocks in one request; they do not split long content. The tool documents headings (levels 4–6 become level 3), numbered/bulleted/to-do lists, code, quotes, tables, inline formatting, and links. HTML and thematic breaks are not supported. Keep captures small; for an authorized larger document, use an initial create followed by sequential modest appends, retaining the new page ID and reporting confirmed sections if interrupted.
- Schema creation, property updates, rename/move/delete, replacement editing, child-page creation, comments, relations, permissions, user lookup, local files, and external URL retrieval are not registered tools. A checkbox or owner label in Markdown is not a database checkbox/people property or a separately tracked task. Native commands and internal helper functions do not add AI capabilities.

The existing OAuth/internal-integration flow, manifest instructions, and three evals remain unchanged. The skill uses only these six tools. This inventory is audit material, not a runtime dependency.
