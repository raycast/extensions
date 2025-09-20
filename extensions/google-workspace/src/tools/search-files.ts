import { getFilesForAI } from "../api/getFiles";
import { withGoogleAuth } from "../components/withGoogleAuth";

export enum QueryTypes {
  fileName = "fileName",
  fullText = "fullText",
  starred = "starred",
}

export enum ScopeTypes {
  user = "user",
  allDrives = "allDrives",
}

type Input = {
  /**
   * Search query string to filter files and folders in Google Drive.
   *
   * # Query Syntax
   * Each query consists of one or more search clauses. Clauses can be combined with logical operators:
   * - `and` - Match both conditions
   * - `or` - Match either condition
   * - `not` - Negate a condition
   *
   * Each clause follows the format: field operator value
   *
   * # Available Operators
   * - `contains` - String contains value (prefix matching for names, full token matching for content)
   * - `=` - Exact match (strings, booleans)
   * - `!=` - Not equal
   * - `<` - Less than (dates)
   * - `<=` - Less than or equal (dates)
   * - `>` - Greater than (dates)
   * - `>=` - Greater than or equal (dates)
   * - `in` - Value exists in collection
   * - `has` - Collection contains element matching parameters
   *
   * # Common Search Fields
   *
   * ## Basic Properties
   * - `name` - File or folder name
   *   Operators: contains, =, !=
   *   Example: "name contains 'budget'" or "name = 'Q1 Report.pdf'"
   *
   * - `fullText` - Search within file content and metadata
   *   Operators: contains
   *   Example: "fullText contains 'quarterly revenue'"
   *   Note: For exact phrases, use double quotes: "fullText contains '"quarterly revenue"'"
   *
   * - `mimeType` - File type
   *   Operators: contains, =, !=
   *   Common values:
   *   - 'application/vnd.google-apps.folder' (Folders)
   *   - 'application/vnd.google-apps.document' (Docs)
   *   - 'application/vnd.google-apps.spreadsheet' (Sheets)
   *   - 'application/vnd.google-apps.presentation' (Slides)
   *   Example: "mimeType = 'application/vnd.google-apps.folder'"
   *
   * ## Dates and Times
   * - `modifiedTime` - Last modification date
   * - `viewedByMeTime` - Last viewed date
   * - `createdTime` - Creation date
   *   Operators: <, <=, =, !=, >, >=
   *   Format: RFC 3339 (e.g., '2024-01-01T00:00:00')
   *   Example: "modifiedTime > '2024-01-01T00:00:00'"
   *
   * ## Status Flags
   * - `trashed` - In trash or not
   * - `starred` - Starred status
   * - `sharedWithMe` - In "Shared with me" collection
   *   Operators: =, !=
   *   Values: true, false
   *   Example: "starred = true"
   *
   * ## Sharing and Permissions
   * - `parents` - Parent folder IDs
   *   Operators: in
   *   Example: "'folder_id' in parents"
   *
   * - `owners` - File owners
   * - `writers` - Users with write access
   * - `readers` - Users with read access
   *   Operators: in
   *   Example: "'user@example.com' in owners"
   *
   * - `visibility` - File visibility level
   *   Operators: =, !=
   *   Values: 'anyoneCanFind', 'anyoneWithLink', 'domainCanFind', 'domainWithLink', 'limited'
   *   Example: "visibility = 'anyoneCanFind'"
   *
   * ## Custom Properties
   * - `properties` - Public custom properties
   * - `appProperties` - Private custom properties
   *   Operators: has
   *   Example: "properties has { key='category' and value='finance' }"
   *
   * # Complex Query Examples
   *
   * Find recent important documents:
   * "modifiedTime > '2024-01-01T00:00:00' and starred = true and mimeType = 'application/vnd.google-apps.document'"
   *
   * Find shared spreadsheets containing "budget":
   * "sharedWithMe = true and mimeType = 'application/vnd.google-apps.spreadsheet' and fullText contains 'budget'"
   *
   * Find non-trashed images in a specific folder:
   * "'folder_id' in parents and mimeType contains 'image/' and trashed = false"
   *
   * Find documents shared with specific domain:
   * "visibility = 'domainCanFind' and mimeType = 'application/vnd.google-apps.document'"
   *
   * # Important Notes
   * 1. String values must be surrounded by single quotes
   * 2. Escape single quotes in values with \' (e.g., "name contains 'Quinn\'s report'")
   * 3. The contains operator only performs prefix matching for names
   * 4. For fullText searches, contains only matches complete tokens
   * 5. Date queries default to UTC timezone
   * 6. Queries are case-insensitive
   */
  query: string;

  /**
   * Scope of the search.
   *
   * Available options:
   * - `user`: Search only in the user's Drive
   * - `allDrives`: Search across all accessible shared drives
   *
   * Note: When using `allDrives`, the search will include files from:
   * - User's personal Drive
   * - Shared Drives the user has access to
   * - Files shared with the user
   */
  scope: ScopeTypes;
};

export default withGoogleAuth(async function (input: Input) {
  const files = await getFilesForAI({
    query: input.query,
    scope: input.scope,
  });
  return files;
});
