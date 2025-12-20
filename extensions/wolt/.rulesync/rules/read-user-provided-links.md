---
targets:
  - "*"
root: false
description: "Guidelines for handling web links provided by users - always read the exact link provided, never search or navigate"
globs:
  - "**/*"
cursor:
  alwaysApply: true
  globs:
    - "**/*"
---

# Read User-Provided Web Links

**CRITICAL**: When a user provides a web link, always read the exact link they provided. Never attempt to search the web or navigate to the page using other tools. Use the exact URL provided by the user.

## Core Principle

When users provide web links, they are giving you a specific resource they want you to read. You should:

- **Use the exact link provided**: Read the URL the user shared, not a search result or navigation path
- **Never search instead**: Don't use web search tools to find the page - use the direct link
- **Never navigate manually**: Don't use browser navigation tools to get to the page - use the provided URL directly
- **Handle GitHub links specially**: For GitHub file links, fetch the raw file content using curl

## Required Workflow

### Step 1: Identify the Link Type

When a user provides a web link, determine what type it is:

- **Standard web URL**: Use `web_search` tool with the exact URL
- **GitHub file link**: Convert to raw GitHub URL and use `run_terminal_cmd` with `curl`
- **GitHub repository link**: Use `web_search` tool with the exact URL
- **Other code hosting platforms**: Use `web_search` tool with the exact URL

### Step 2: Read the Link

#### For Standard Web URLs

Use the `web_search` tool with the exact URL provided by the user:

```bash
web_search(search_term: "https://example.com/page")
```

**Important**: Pass the exact URL as the search term. The tool will fetch the content from that URL.

#### For GitHub File Links

If the user provides a GitHub file link (e.g., `https://github.com/user/repo/blob/branch/path/to/file`):

1. **Convert to raw URL**: Replace `/blob/` with `/raw/` in the URL
   - Example: `https://github.com/user/repo/blob/main/src/file.ts` → `https://raw.githubusercontent.com/user/repo/main/src/file.ts`
2. **Use curl to fetch**: Use `run_terminal_cmd` to curl the raw file:
   ```bash
   curl -s https://raw.githubusercontent.com/user/repo/main/src/file.ts
   ```

**Alternative**: You can also use the `web_search` tool with the raw GitHub URL directly.

### Step 3: Process the Content

After reading the link:

- Extract relevant information from the content
- Use the information to answer the user's question or complete their task
- Reference the source when using information from the link

## Examples of What NOT to Do

❌ **Don't**: Use web search to find a page when the user provided a direct link

```text
User: "Check this: https://example.com/docs/api"
Agent: [Uses web_search with "example.com docs api" instead of the exact URL]
```

❌ **Don't**: Navigate manually using browser tools when a direct link is provided

```text
User: "Read this: https://docs.example.com/guide"
Agent: [Uses browser_navigate and tries to find the page instead of using the exact URL]
```

❌ **Don't**: Ignore GitHub file links or read them as regular web pages

```text
User: "See this file: https://github.com/user/repo/blob/main/src/index.ts"
Agent: [Tries to read the GitHub web page instead of fetching the raw file]
```

❌ **Don't**: Modify or search for alternatives to the provided link

```text
User: "Check https://specific-version.example.com/docs"
Agent: [Searches for "example.com docs" instead of using the specific version URL]
```

## Examples of What TO Do

✅ **Do**: Use the exact URL provided by the user

```text
User: "Check this: https://example.com/docs/api"
Agent: [Uses web_search with the exact URL: "https://example.com/docs/api"]
```

✅ **Do**: Convert GitHub file links to raw URLs and fetch with curl

```text
User: "See this file: https://github.com/user/repo/blob/main/src/index.ts"
Agent: [Converts to raw URL and uses curl:
  curl -s https://raw.githubusercontent.com/user/repo/main/src/index.ts]
```

✅ **Do**: Use the exact link even if you think you know what it contains

```text
User: "Read this: https://docs.example.com/v2.0/api-reference"
Agent: [Uses web_search with exact URL: "https://docs.example.com/v2.0/api-reference"]
```

✅ **Do**: Handle GitHub repository links as regular URLs

```text
User: "Check this repo: https://github.com/user/repo"
Agent: [Uses web_search with exact URL: "https://github.com/user/repo"]
```

## GitHub Link Handling

### Converting GitHub File Links to Raw URLs

GitHub file links follow this pattern:

```text
https://github.com/{owner}/{repo}/blob/{branch}/{path}
```

Convert to raw URL:

```text
https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
```

### Examples

- `https://github.com/user/project/blob/main/src/index.ts`
  → `https://raw.githubusercontent.com/user/project/main/src/index.ts`

- `https://github.com/org/lib/blob/develop/packages/core/package.json`
  → `https://raw.githubusercontent.com/org/lib/develop/packages/core/package.json`

- `https://github.com/user/repo/blob/feature-branch/docs/README.md`
  → `https://raw.githubusercontent.com/user/repo/feature-branch/docs/README.md`

### Using curl for GitHub Raw Files

When fetching GitHub raw files, use curl with appropriate flags:

```bash
curl -s https://raw.githubusercontent.com/user/repo/branch/path/to/file
```

The `-s` flag suppresses progress output for cleaner results.

## Common Pitfalls

- **Assuming you know the content**: Even if you think you know what a link contains, always read it using the exact URL provided
- **Searching instead of reading**: Don't use web search to find information when a direct link is provided
- **Not converting GitHub links**: Remember to convert GitHub file links to raw URLs before fetching
- **Modifying URLs**: Don't change the URL structure or parameters - use exactly what the user provided
- **Using browser navigation**: Don't use browser tools to navigate - use the direct URL with web_search or curl

## Summary

1. **Always use the exact link provided** - Never search or navigate to find the page
2. **Convert GitHub file links** - Transform `/blob/` URLs to raw GitHub URLs
3. **Use curl for GitHub raw files** - Fetch raw file content directly with curl
4. **Use web_search for standard URLs** - Pass the exact URL as the search term
5. **Never modify URLs** - Use the exact URL structure and parameters provided by the user
6. **Trust the user's link** - They provided it for a reason, so read it directly

