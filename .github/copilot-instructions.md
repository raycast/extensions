# GitHub Copilot Instructions for Raycast Extensions

This document provides GitHub Copilot with specific guidelines and patterns for working with the Raycast Extensions repository. These instructions help ensure pull requests comply with project standards and best practices.

## Repository Overview

This repository contains extensions for [Raycast](https://raycast.com/), built using React and TypeScript. Extensions are located in the `extensions/` directory, each with their own package.json, source code, and metadata.

## Core Guidelines

### CHANGELOG.md Requirements

**CRITICAL**: All CHANGELOG.md entries MUST follow these rules:

- **Template String**: New entries MUST end with `{PR_MERGE_DATE}` - never use actual dates like `2024-07-12`
- **Format**: Use `## [Title] - {PR_MERGE_DATE}` format
- **Placement**: New entries go at the TOP of the file (newest first)
- **Consistency**: Header wording should match the `title` field in package.json

```markdown
# Extension Name Changelog

## [Fix Memory Leak Issue] - {PR_MERGE_DATE}

- Fixed memory leak in background process
- Updated dependencies to latest versions

## [Initial Version] - 2024-01-15
```

**Do NOT suggest changing the `{PR_MERGE_DATE}` template string if it's already present.**

### package.json Guidelines

#### Command Name Changes
When reviewing package.json updates, check for command name changes:
- **Comment if command names change**: "Can we keep the old `name`? It is the unique ID of the command where ranking, aliases, and hotkeys are saved. You can, of course, change the title :slightly_smiling_face:."
- Commands can change `title` but should preserve `name` for continuity

#### Author Field Changes
- **Alert on author changes**: Comment when the `author` field is modified in package.json

#### New Extension Requirements
For PRs labeled `new extension`:
- **Metadata folder required**: Must include `metadata/` folder with screenshots
- **View commands**: Required if package.json contains any `view` commands
- **Reference**: Link to [Raycast Documentation](https://developers.raycast.com/basics/prepare-an-extension-for-store#how-to-use-it)

### Error Handling Patterns

#### Try-Catch Blocks
- **launchCommand**: Always wrap in try-catch blocks
- **Toast alternatives**: When using `showToast` in try-catch, suggest `showFailureToast` from `@raycast/utils` for simplification

#### Loading States
- **Lists and Grids**: Use `isLoading` prop to prevent empty state flicker
- **Reference**: [Empty States Documentation](https://developers.raycast.com/basics/prepare-an-extension-for-store#empty-states)

#### Text Selection
- **getSelectedText()**: Ensure graceful error handling when this function is used

```typescript
// Good pattern
try {
  const selectedText = await getSelectedText();
  // Handle selected text
} catch (error) {
  // Graceful fallback when no text is selected
  showToast({
    style: Toast.Style.Failure,
    title: "No text selected",
  });
}
```

### AI Extensions Requirements

For extensions with `tools` in package.json:
- **AI field required**: Must include `ai` section with `evals`
- **Minimum requirement**: At least one evaluation
- **Reference**: [AI Evals Documentation](https://developers.raycast.com/ai/write-evals-for-your-ai-extension)

```json
{
  "tools": [...],
  "ai": {
    "evals": [
      {
        "name": "basic-functionality",
        "description": "Tests basic tool functionality"
      }
    ]
  }
}
```

### Documentation and Text Standards

#### Consistency Requirements
- **Headers**: CHANGELOG and README headers should match `title` in package.json
- **Subtitles**: For multi-command extensions, suggest adding `subtitle` to commands using the service name (likely the `title` from package.json)

#### Multiple Commands Pattern
```json
{
  "commands": [
    {
      "name": "search",
      "title": "Search Items",
      "subtitle": "Service Name"
    },
    {
      "name": "create",
      "title": "Create Item", 
      "subtitle": "Service Name"
    }
  ]
}
```

### Code Quality Standards

#### .prettierrc
- **Use Raycast's code style**: Don't suggest modifications to .prettierrc
- **Standard formatting**: Extensions should follow the established Raycast formatting rules

#### AI-Generated Content Detection
- **Comment on AI-generated PRs**: If a PR appears to be 100% AI-generated, note this observation
- **Quality review**: Ensure AI-generated code follows project patterns and standards

### Localization Policy

- **US English only**: Raycast does not support localization
- **No custom localization**: Avoid introducing custom localization methods
- **Preferences for locale**: Use the preferences API when locale affects functionality (e.g., units of measurement)

## Common Review Points

### New Extensions Checklist
- [ ] Contains metadata folder with screenshots (if view commands exist)
- [ ] CHANGELOG.md with proper format and `{PR_MERGE_DATE}`
- [ ] package.json follows naming conventions
- [ ] Error handling implemented properly
- [ ] AI evals included (if tools are present)

### Extension Updates Checklist
- [ ] CHANGELOG.md entry added at top with `{PR_MERGE_DATE}`
- [ ] Command names preserved (only titles changed)
- [ ] Author field changes noted
- [ ] Loading states implemented for UI components
- [ ] Error handling follows patterns

### Code Review Focus Areas
- Try-catch blocks around `launchCommand`
- Proper use of `isLoading` in Lists/Grids
- Graceful error handling for `getSelectedText()`
- Consistent naming between package.json, README, and CHANGELOG
- AI extension requirements compliance

## References

- [Raycast Developer Documentation](https://developers.raycast.com/)
- [Extension Guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Community Guidelines](https://manual.raycast.com/community-guidelines)
- [Publishing Documentation](https://developers.raycast.com/basics/publish-an-extension)

## Notes for Reviewers

When reviewing PRs:
1. Check for proper CHANGELOG.md format with `{PR_MERGE_DATE}`
2. Verify error handling patterns are followed
3. Ensure new extensions have required metadata
4. Confirm AI extensions include proper evals
5. Look for consistency in naming and documentation
6. Note any command name changes that might affect user experience

Remember: These guidelines help maintain consistency and quality across all Raycast extensions while preserving the user experience through proper ID management and error handling.