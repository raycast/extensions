---
description: "Add or update rules in the repository using Rulesync"
targets: ["*"]
---

When adding new rules or modifying existing rules for AI development tools, always use Rulesync to manage them centrally. This ensures consistency across all supported AI tools (Cursor, Claude Code, GitHub Copilot, etc.).

## Core Principle

**Always use Rulesync, even when the user requests a specific tool's rule format.**

Even if a user explicitly asks for a specific agent's rule format (e.g., "Add a cursor rule", "Add a Claude Code rule", "Add a .cursorrules file"), you must:

1. **Add the rule to `.rulesync/rules/`** instead of directly to tool-specific configuration files
2. **Use Rulesync to generate** the tool-specific configurations
3. **Never bypass Rulesync** by directly editing tool-specific files like `.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`, etc.

## Workflow Steps

### Step 1: Create or Update Rule File

Rules should be added to `.rulesync/rules/` directory. Rule files can be:

- Markdown files (`.md`)
- Markdown Component files (`.mdc`)

Each rule file should include frontmatter with:

- `targets`: List of tools this rule applies to (use `["*"]` for all tools)
- `root`: Whether this is a root-level rule
- `globs`: File patterns this rule applies to
- Tool-specific settings (e.g., `cursor.alwaysApply`)

### Step 2: Use Rulesync MCP (Recommended)

The Rulesync MCP server is available and configured in `.rulesync/mcp.json`. Use it to:

- **List rules**: Discover existing rule files
- **Get rules**: Read existing rule content
- **Put rules**: Create or update rule files
- **Delete rules**: Remove rule files

This is the preferred method for programmatic rule management as it ensures proper formatting and structure.

### Step 3: Generate Tool-Specific Configurations

**CRITICAL**: After adding, updating, or deleting any rule file, you MUST run:

```bash
rulesync generate
```

Or for specific targets:

```bash
rulesync generate --targets cursor,claudecode --features rules
```

This command:

- Generates tool-specific configuration files from the unified rules
- Ensures all AI tools have the latest rules
- Updates files like `.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`, etc.

**Never skip this step** - rules added to `.rulesync/rules/` will not take effect until `rulesync generate` is run.

## How to Write Effective Rule Content

When creating or updating a rule file, follow these guidelines to ensure the rule is clear, actionable, and effective.

### Frontmatter (Required)

The YAML frontmatter **must** be the absolute first content in the file. Any leading spaces, lines, or characters can prevent the rule from loading correctly.

```markdown
---
targets:
  - "*" # or ["cursor", "claudecode", "codexcli"] for specific tools
root: false # Whether this is a root-level rule
description: "Clear, semantic description of what this rule covers"
globs:
  - "**/*" # File patterns that trigger this rule
cursor: # Optional: Instructions for specific targets
  alwaysApply: true # Optional: Include rule regardless of file context
  globs:
    - "**/*" # Optional: Tool-specific glob patterns
---
```

#### Frontmatter Fields Explained

- **`targets`**: List of AI tools this rule applies to. Use `["*"]` for all tools, or specify `["cursor", "claudecode", "codexcli"]` for specific tools.
- **`root`**: Boolean indicating if this is a root-level rule (typically `false`).
- **`description`**: A concise, semantic description starting with phrases like "Guidelines for..." or "Instructions on...". This helps Rulesync and AI tools select the most relevant rule when multiple match. Be specific and descriptive.
- **`globs`**: File pattern(s) that trigger this rule's automatic activation. Be specific!
- **`cursor.alwaysApply`**: (Optional) If `true`, the rule is included in context regardless of files being referenced. Use for critical, always-relevant rules.
- **`cursor.globs`**: (Optional) Tool-specific glob patterns that override or supplement the main `globs` for Cursor.

### Content Structure (Recommended)

Organize rule content logically using markdown headings. Follow this structure:

#### 1. Title and Introduction

Start with a clear title (H1) and brief introduction:

```markdown
# Rule Title

**CRITICAL**: [If applicable] Brief statement about why this rule is important.

[Brief explanation of what problem this rule solves or what pattern it defines]
```

#### 2. Core Principle

Explain the fundamental principle or concept:

```markdown
## Core Principle

[Explain the underlying principle, why this pattern/convention is important, and when it's relevant]
```

#### 3. Required Workflow / Pattern Description

Document the recommended pattern or workflow:

```markdown
## Required Workflow

### Step 1: [Action]

- **Key point**: Explanation
- **Another point**: More details

### Step 2: [Next Action]

...
```

Or for pattern-based rules:

```markdown
## Pattern Description

[Clearly document the recommended pattern(s) or conventions with code examples]

\`\`\`typescript
// Example code showing the pattern
function example() {
// Correct implementation
}
\`\`\`
```

#### 4. Examples: What NOT to Do / What TO Do

Include clear examples of anti-patterns and correct patterns:

```markdown
## Examples of What NOT to Do

❌ **Don't**: [Bad practice with explanation]

## Examples of What TO Do

✅ **Do**: [Good practice with explanation]
```

#### 5. Real-World Examples (Highly Recommended)

Link to actual code in the repository:

```markdown
## Real-World Examples

- [Example Component](mdc:../src/components/ui/Button.tsx) - Shows proper component structure
- [Example API Route](mdc:../src/server/api/users.ts) - Demonstrates API conventions
```

#### 6. Common Pitfalls / Anti-Patterns

List common mistakes and how to avoid them:

```markdown
## Common Pitfalls

- **Pitfall 1**: Explanation of the mistake and how to recognize it
- **Pitfall 2**: How to fix or avoid this issue
```

#### 7. Summary (Optional)

For complex rules, include a summary:

```markdown
## Summary

1. **Key point 1** - Brief reminder
2. **Key point 2** - Brief reminder
3. **Key point 3** - Brief reminder
```

### Complete Rule Template

```markdown
---
targets:
  - "*"
root: false
description: "Guidelines for [purpose and scope]"
globs:
  - "[specific file pattern]"
cursor:
  alwaysApply: false
  globs:
    - "[optional tool-specific pattern]"
---

# Rule Title

**CRITICAL**: [If applicable] Brief statement about importance.

[Introduction explaining what problem this rule solves or what pattern it defines]

## Core Principle

[Explain the fundamental principle and why it matters]

## Required Workflow

### Step 1: [Action]

- **Key point**: Explanation

### Step 2: [Next Action]

- **Key point**: Explanation

## Pattern Description

[Document the pattern with code examples]

\`\`\`typescript
// Example code
\`\`\`

## Examples of What NOT to Do

❌ **Don't**: [Bad practice]

## Examples of What TO Do

✅ **Do**: [Good practice]

## Real-World Examples

- [Example](mdc:../path/to/example.ts) - Brief explanation

## Common Pitfalls

- **Pitfall**: Explanation and how to avoid

## Summary

1. **Key point 1**
2. **Key point 2**
```

## Best Practices for Writing Rules

### 1. Start Simple, Iterate

Don't aim for perfection immediately. Start with basic rules for core conventions and add/refine them over time as you observe the AI's behavior and identify gaps.

### 2. Be Specific but Flexible

- Provide clear, actionable guidance with concrete examples
- Use recommending language ("prefer", "consider", "typically") rather than overly rigid commands ("must", "always") unless a strict convention is required
- Explain the _why_ behind rules - this helps the AI understand context and apply rules appropriately

### 3. Use Clear Code Examples

Always use fenced code blocks with language specifiers for correct rendering:

````markdown
```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}
```
````

### 4. Link to Real Code

Include references to actual code in your repository using relative paths:

```markdown
- [Example Button Component](mdc:../src/components/ui/Button.tsx)
- [Example API Route](mdc:../src/server/api/users.ts)
```

### 5. Be Modular

Break down complex domains into smaller, focused rules rather than creating one monolithic rule:

- ✅ Good: `api-routing.mdc`, `database-models.mdc`, `auth-middleware.mdc`
- ❌ Bad: `backend-everything.mdc`

### 6. Use Specific Glob Patterns

Prefer specific glob patterns over broad ones:

- ✅ Good: `src/components/**/*.{tsx,jsx}` - Only React components
- ❌ Bad: `**/*` - All files (unless truly necessary)

### 7. Write Clear Descriptions

The `description` field helps AI tools select the most relevant rule. Make it:

- Concise but descriptive
- Start with action phrases: "Guidelines for...", "Instructions on...", "Explain..."
- Include key terms that match when the rule should be used

### 8. Keep Rules Maintainable

- Start simple and iterate - don't aim for perfection immediately
- Regularly review rules and update them when conventions change
- Delete rules that become obsolete
- Rules should evolve with your codebase

## Writing Guidelines

### Language and Tone

- **Use imperative mood**: "Always use..." rather than "You should use..."
- **Be direct and clear**: Avoid ambiguity
- **Explain reasoning**: Help the AI understand _why_ a pattern exists
- **Use consistent formatting**: Follow the structure patterns from existing rules

### Code Examples

- **Show correct patterns**: Always include examples of the right way to do things
- **Include anti-patterns**: Show what NOT to do with explanations
- **Use realistic examples**: Base examples on actual code patterns in your codebase
- **Keep examples focused**: Each example should illustrate one concept clearly

### Structure Consistency

Follow the patterns established in existing rules:

- Start with **CRITICAL** statement if the rule is mandatory
- Include **Core Principle** section explaining the fundamental concept
- Use **Required Workflow** for process-based rules
- Include **Examples of What NOT to Do** and **Examples of What TO Do**
- Add **Common Pitfalls** section for complex rules
- End with **Summary** for longer rules

## Reference Examples

Study existing rules in `.rulesync/rules/` to understand patterns:

- **`package-installation.md`**: Shows workflow-based rule with clear steps and comprehensive examples
- **`implement-task.md`**: Demonstrates structured workflow with checklists
- **`five.md`**: Shows technique-based rule with example analysis
- **`adding-rules.md`**: Meta-rule that explains the rule system itself

Each follows consistent patterns while being tailored to their specific purpose.

## Troubleshooting

If rules aren't working as expected:

1. **Check frontmatter**: Ensure YAML frontmatter is the absolute first content (no leading spaces/lines)
2. **Verify glob patterns**: Test that your glob patterns match the intended files
3. **Check description**: Ensure the description is clear and semantic
4. **Run rulesync generate**: Rules won't take effect until `pnpm rulesync` is run
5. **Review tool-specific files**: Check generated files (`.cursorrules`, `CLAUDE.md`) to see if the rule appears
6. **Test activation**: Open a file matching the glob pattern and verify the rule is included in context

## Verification

After generating rules, verify they were applied correctly:

- Check that tool-specific configuration files were updated (`.cursorrules`, `CLAUDE.md`, etc.)
- Verify the rule appears in the generated files with correct formatting
- Test that the AI tool recognizes the new rule by referencing a file matching the glob pattern
- Confirm the rule content is complete and properly formatted

## Command Checklist

When adding or updating a rule:

### Planning Phase

- [ ] Determine if rule already exists (use Rulesync MCP `listRules` or check `.rulesync/rules/`)
- [ ] Review existing rules to understand structure and patterns
- [ ] Decide on appropriate glob patterns for rule activation
- [ ] Identify the scope and purpose of the rule

### Writing Phase

- [ ] Create rule file in `.rulesync/rules/` with proper frontmatter:
  - [ ] `targets` field specified (use `["*"]` for all tools)
  - [ ] `description` is clear and semantic (starts with "Guidelines for..." or similar)
  - [ ] `globs` patterns are specific and appropriate
  - [ ] `cursor.alwaysApply` set correctly (true only for critical rules)
- [ ] Write rule content following recommended structure:
  - [ ] Clear title and introduction
  - [ ] Core Principle section
  - [ ] Required Workflow or Pattern Description
  - [ ] Examples of What NOT to Do
  - [ ] Examples of What TO Do
  - [ ] Real-world examples linking to actual code (if applicable)
  - [ ] Common Pitfalls section (for complex rules)
  - [ ] Summary (for longer rules)
- [ ] Include code examples with proper language specifiers
- [ ] Use imperative mood and clear, direct language
- [ ] Explain the _why_ behind the rule

### Implementation Phase

- [ ] Use Rulesync MCP `putRule` if available, otherwise create file manually
- [ ] Verify frontmatter is the absolute first content (no leading spaces/lines)
- [ ] Run `pnpm rulesync` or `rulesync generate --targets "*" --features "*"`
- [ ] Verify generated files were updated correctly
- [ ] Confirm rule appears in tool-specific configuration files (`.cursorrules`, `CLAUDE.md`, etc.)
- [ ] Test rule activation by opening a file matching the glob pattern

## Examples

### ✅ DO: Add Rule Using Rulesync

1. Create rule file in `.rulesync/rules/` (e.g., `my-new-rule.md`)
2. Add proper frontmatter with targets, globs, etc.
3. Add rule content
4. Run `pnpm rulesync` to generate configurations

### ❌ DON'T: Directly Edit Tool-Specific Files

- Don't directly edit `.cursorrules`
- Don't directly edit `CLAUDE.md`
- Don't directly edit `.github/copilot-instructions.md`
- Always use Rulesync workflow instead

### ✅ DO: Use Rulesync MCP

When available, use the Rulesync MCP tools to manage rules programmatically:

- `putRule` - Create or update a rule file
- `getRule` - Read a rule file
- `listRules` - List all rule files
- `deleteRule` - Remove a rule file

Then run `pnpm rulesync` to apply changes.

## Quick Reference

- **Rule location**: `.rulesync/rules/`
- **File format**: `.md` or `.mdc`
- **After creating/updating**: Always run `pnpm rulesync`
- **Frontmatter**: Must be first content in file (no leading spaces)
- **Structure**: Follow the template and patterns from existing rules
- **Examples**: Reference actual code in your repository

## Important Notes

- Rules added to `.rulesync/rules/` will not take effect until `rulesync generate` is run
- Always use Rulesync - never directly edit tool-specific rule files
- Rules should be added to `.rulesync/rules/` - the central location for all rules
- Use Rulesync MCP when available for programmatic rule management
- Always verify changes after generating rules
- Frontmatter must be the absolute first content in the file (no leading spaces or lines)
- Use specific glob patterns rather than `**/*` unless truly necessary
- Follow the structure patterns from existing rules for consistency
