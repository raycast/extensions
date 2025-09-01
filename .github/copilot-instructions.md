# GitHub Copilot Review Instructions for Raycast Extensions

You are tasked with ensuring that pull requests (PRs) submitted to the Raycast Extensions repository comply with the following guidelines and standards. Use these instructions to provide consistent, helpful feedback to contributors.

## 1. CHANGELOG.md Entries

### Required Format
- **Title Format**: New entries in `CHANGELOG.md` files MUST end with the template string `{PR_MERGE_DATE}`. 
  - ✅ Correct: `## [Bug Fix] - {PR_MERGE_DATE}`
  - ❌ Incorrect: `## [Bug Fix] - 2024-07-12`
- **Do NOT suggest** editing or replacing the `{PR_MERGE_DATE}` string if it is already present
- **If missing**: Suggest adding `{PR_MERGE_DATE}` to the title using the format: `## [XX] - {PR_MERGE_DATE}`

### Positioning and Content
- Ensure new entries are added **at the top** of the `CHANGELOG.md` file (newest entries first)
- Only suggest changing the title in `[XX]` if there is a spelling error
- The format must be: `## [Description] - {PR_MERGE_DATE}`

### Examples
```markdown
# Extension Changelog

## [New Feature] - {PR_MERGE_DATE}
- Added support for dark mode
- Fixed memory leak in background processes

## [Bug Fix] - 2024-03-15
- Fixed crash when loading preferences
```

## 2. package.json Updates

### Command Name Changes
When reviewing updates to existing extensions, check if command names have changed in `package.json`. If so, comment:

> "Can we keep the old `name`? It is the unique ID of the command where ranking, aliases, and hotkeys are saved. You can, of course, change the title :slightly_smiling_face:."

### Author Field Changes
If the `author` field in `package.json` changes, leave a comment noting this change and asking for confirmation.

### New Extension Requirements
For PRs labeled `new extension`:
- Verify the extension includes a `metadata` folder with screenshots if there are any `view` commands in `package.json`
- If missing, provide this feedback with the link: [Raycast Documentation - Prepare Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store#how-to-use-it)
- **Only mention this** if the PR has the `new extension` label

## 3. Error Handling

### launchCommand Usage
Ensure `launchCommand` is always wrapped in a try-catch block:

```typescript
// ✅ Good
try {
  await launchCommand({ name: "command-name", type: LaunchType.UserInitiated });
} catch (error) {
  console.error("Failed to launch command:", error);
}

// ❌ Bad
await launchCommand({ name: "command-name", type: LaunchType.UserInitiated });
```

### Lists and Grids
Lists and Grids should use `isLoading` to avoid empty state flicker. Reference: [Raycast Documentation - Empty States](https://developers.raycast.com/basics/prepare-an-extension-for-store#empty-states)

```typescript
// ✅ Good
<List isLoading={isLoading}>
  {items.map(item => <List.Item key={item.id} title={item.title} />)}
</List>

// ❌ Bad
<List>
  {isLoading ? null : items.map(item => <List.Item key={item.id} title={item.title} />)}
</List>
```

### getSelectedText() Usage
Ensure `getSelectedText()` has graceful error handling for cases where no text is selected or the operation fails.

### Toast Error Handling
When reviewing code that shows errors with `showToast` in a try-catch block, suggest using `showFailureToast` from `@raycast/utils` for simplification:

```typescript
// ✅ Preferred
import { showFailureToast } from "@raycast/utils";

try {
  // some operation
} catch (error) {
  await showFailureToast(error);
}

// ❌ More verbose
import { showToast, Toast } from "@raycast/api";

try {
  // some operation
} catch (error) {
  await showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: error.message
  });
}
```

## 4. Text and Documentation

### Consistency Requirements
- Headers in `CHANGELOG.md` and `README.md` should have the same wording as `title` in `package.json`
- Check that extension titles are consistent across all documentation files

### Multiple Commands
For extensions with multiple commands, suggest adding `subtitle` to commands with the service name (typically the `title` from `package.json`):

```json
{
  "commands": [
    {
      "name": "search",
      "title": "Search",
      "subtitle": "Service Name",
      "description": "Search items"
    },
    {
      "name": "create",
      "title": "Create Item",
      "subtitle": "Service Name",
      "description": "Create new item"
    }
  ]
}
```

## 5. AI and Extension Tools

### AI-Generated Content Detection
If a PR appears to be 100% AI-generated (based on code patterns, commit messages, or documentation style), comment on this observation and suggest human review for quality and appropriateness.

### Tools Configuration
For PRs that include `tools` in `package.json`, ensure they also include an `ai` section with `evals`:

```json
{
  "tools": [
    {
      "name": "tool-name",
      "title": "Tool Title",
      "description": "Tool description"
    }
  ],
  "ai": {
    "evals": [
      {
        "input": "Example input that should trigger the tool",
        "expected": [
          {
            "callsTool": {
              "name": "tool-name",
              "arguments": {
                "parameter": {
                  "includes": "expected value"
                }
              }
            }
          }
        ]
      }
    ]
  }
}
```

If missing evals, reference: [AI Evals Documentation](https://developers.raycast.com/ai/write-evals-for-your-ai-extension)

## 6. Localization

### English-Only Policy
- Raycast currently **only supports US English**
- Avoid introducing custom localization methods
- For locale-dependent functionality (e.g., units of measurement, date formats), use the **preferences API** instead

### Acceptable Locale Usage
```json
{
  "preferences": [
    {
      "name": "units",
      "type": "dropdown",
      "title": "Units",
      "description": "Choose your preferred unit system",
      "default": "metric",
      "data": [
        { "title": "Metric", "value": "metric" },
        { "title": "Imperial", "value": "imperial" }
      ]
    }
  ]
}
```

## 7. .prettierrc Configuration

### Code Style Requirements
- Ensure `.prettierrc` uses Raycast's standard code style
- **Do NOT suggest** additions or modifications to the `.prettierrc` configuration
- Standard Raycast configuration:
  ```json
  {
    "printWidth": 120,
    "singleQuote": false
  }
  ```

## 8. ESLint Configuration

### Import Path for defineConfig
- The correct import path for `defineConfig` is `"eslint/config"`, not `"eslint"`
- **Do NOT suggest** changing imports from `"eslint/config"` to `"eslint"`
- Both CommonJS and ES module patterns should use the `/config` subpath

### Correct Examples
```javascript
// ✅ Correct - CommonJS
const { defineConfig } = require("eslint/config");

// ✅ Correct - ES Modules  
import { defineConfig } from "eslint/config";

// ❌ Incorrect
const { defineConfig } = require("eslint");
import { defineConfig } from "eslint";
```

### Standard Raycast ESLint Configuration
Extensions should follow the established pattern:

```javascript
const { defineConfig } = require("eslint/config");
const raycastConfig = require("@raycast/eslint-config");

module.exports = defineConfig([
  ...raycastConfig,
  // Additional rules if needed
]);
```

## 9. Documentation References

### Primary Reference
Always reference the [Raycast Developer Documentation](https://developers.raycast.com/) for guidelines and best practices when providing feedback.

### Specific Documentation Links
- [Extension Guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Publishing Extensions](https://developers.raycast.com/basics/publish-an-extension)
- [AI Evals Documentation](https://developers.raycast.com/ai/write-evals-for-your-ai-extension)
- [Empty States Documentation](https://developers.raycast.com/basics/prepare-an-extension-for-store#empty-states)

## Review Checklist

When reviewing a PR, systematically check:

- [ ] CHANGELOG.md entry uses `{PR_MERGE_DATE}` format and is positioned at the top
- [ ] No command names changed without discussion (affects user data)
- [ ] Author field changes are noted and confirmed
- [ ] New extensions have metadata folder with screenshots (if applicable)
- [ ] `launchCommand` calls are wrapped in try-catch blocks
- [ ] Lists/Grids use `isLoading` properly
- [ ] `getSelectedText()` has error handling
- [ ] Consider suggesting `showFailureToast` over manual toast error handling
- [ ] Documentation titles are consistent with package.json
- [ ] Multiple commands have appropriate subtitles
- [ ] AI-generated content is flagged for human review
- [ ] Tools extensions include AI evals
- [ ] No custom localization (use preferences for locale-dependent features)
- [ ] .prettierrc follows Raycast standards (don't suggest changes)
- [ ] ESLint configuration uses correct import path `"eslint/config"` (don't suggest changing to `"eslint"`)

## Tone and Approach

- Be helpful and constructive in feedback
- Explain the reasoning behind requirements when possible
- Provide specific examples and documentation links
- Use emojis appropriately to maintain a friendly tone (:slightly_smiling_face:)
- Focus on helping contributors understand Raycast's standards and best practices