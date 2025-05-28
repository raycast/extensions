# `executeSQL`

A function that executes a SQL query on a local SQLite database and returns the query result in JSON format.

## Signature

```ts
function executeSQL<T = unknown>(databasePath: string, query: string): Promise<T[]>
```

### Arguments

- `databasePath` is the path to the local SQL database.
- `query` is the SQL query to run on the database.

### Return

Returns a `Promise` that resolves to an array of objects representing the query results.

## Example

```typescript
import { closeMainWindow, Clipboard } from "@raycast/api";
import { executeSQL } from "@raycast/utils";

type Message = { body: string; code: string };

const DB_PATH = "/path/to/chat.db";

export default async function Command() {
  const query = `
    SELECT body, code
    FROM message
    ORDER BY date DESC
    LIMIT 1;
  `;

  const messages = await executeSQL<Message>(DB_PATH, query);

  if (messages.length > 0) {
    const latestCode = messages[0].code;
    await Clipboard.paste(latestCode);
    await closeMainWindow();
  }
}
```