# Raycast Extension Development Guidelines

## 📋 Overview

This document captures the **unofficial but critical** requirements and best practices for Raycast extension development that are not explicitly documented in the official guidelines. These lessons were learned through actual PR review feedback.

---

## 🌍 Localization & Language

### ❌ Multi-language Support
- **Rule**: Raycast only supports **US English**
- **Impact**: Remove all non-English text, including:
  - UI strings
  - Code comments
  - AI prompts
  - Documentation
  - Error messages

**Example Issues:**
```typescript
// ❌ Bad
const prompt = `📁 Repository Path: ${path}
🌿 Current Branch: ${branch}`;

// ✅ Good
const prompt = `Repository Path: ${path}
Current Branch: ${branch}`;
```

**Action Items:**
- Remove language selection options (e.g., `Language.ZH`)
- Translate all Chinese/non-English comments to English
- Remove multi-language feature mentions from README

---

## 🚫 Emoji Usage Policy

### Strict No-Emoji Rule
- **Rule**: **NO emojis** in code unless explicitly requested by user
- **Scope**: Applies to ALL code locations:
  - ✗ UI strings (Form.info, Toast messages)
  - ✗ AI prompts
  - ✗ Action titles
  - ✗ Comments
  - ✗ Constant definitions

**Common Violations:**
```typescript
// ❌ Bad - Emojis in UI
info="💡 Tip: Use AI to generate context"
message: `✅ ${successCount} succeeded, ❌ ${failCount} failed`

// ✅ Good - Plain text
info="Tip: Use AI to generate context"
message: `${successCount} succeeded, ${failCount} failed`

// ❌ Bad - Emojis in data structures
const PRESETS = [
  { name: "Projects", icon: "📁" },
  { name: "Code", icon: "💻" }
];

// ✅ Good - Use Icon enum
const PRESETS = [
  { name: "Projects" },  // Icon handled by Icon.Folder
  { name: "Code" }
];
```

**Exception:**
- Gitmoji-style commit messages were removed because emojis are not allowed
- Even feature-related emojis (like Gitmoji support) must be removed

---

## 🔒 Security Best Practices

### Command Injection Prevention

#### 1. Commit Message Escaping
- **Rule**: Never use string replacement for commit messages
- **Safe Method**: Use heredoc or file-based approach

```typescript
// ❌ Bad - Vulnerable to injection
await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: path });

// ✅ Good - Safe heredoc approach
const command = `git commit -F - <<'EOF'\n${message}\nEOF`;
await execAsync(command, { cwd: path });
```

#### 2. Shell Parameter Quoting
- **Rule**: Always quote file paths and parameters in shell commands

```typescript
// ❌ Bad - Fails with spaces
execSync(`open -a ${appName} ${path}`);

// ✅ Good - Properly quoted
execSync(`open -a "${appName}" "${path}"`, { timeout: 10000 });
```

#### 3. Command Timeouts
- **Rule**: Always add timeout to `execSync` calls

```typescript
// ❌ Bad - No timeout
execSync(`open -a "${name}" "${path}"`);

// ✅ Good - With timeout
execSync(`open -a "${name}" "${path}"`, { timeout: 10000 });
```

---

## 🖥️ Platform Support

### macOS Only Declaration
- **Rule**: Explicitly declare macOS-only support
- **Impact**: Remove all Windows/Linux references

**package.json:**
```json
{
  "platforms": ["macOS"],
  "preferences": [
    {
      "name": "terminalIde",
      "default": "Terminal"  // ❌ Not {"macOS": "Terminal", "Windows": "VS Code"}
    }
  ]
}
```

**Documentation:**
```markdown
## Requirements
- macOS  // ❌ Not "macOS or Windows"
```

---

## 📝 Metadata & Documentation

### CHANGELOG Format
- **Rule**: Use `{PR_MERGE_DATE}` placeholder for dates

```markdown
<!-- ❌ Bad -->
## [0.1.0] - 2025-11-17

<!-- ✅ Good -->
## [0.1.0] - {PR_MERGE_DATE}
```

### README Best Practices
- Remove feature mentions that violate guidelines (emojis, multi-language)
- Keep descriptions concise and accurate
- Ensure all claims match actual implementation

---

## 💻 Code Quality

### 1. Avoid Code Duplication
**Issue**: Duplicate error handling blocks

```typescript
// ❌ Bad - Duplicate error handling
try {
  if (autoStage) {
    try {
      await stageFiles();
    } catch (error) {
      if (error.message.includes("index.lock")) {
        await handleLock();
      }
    }
  }
} catch (error) {
  if (error.message.includes("index.lock")) {  // Duplicate!
    await handleLock();
  }
}

// ✅ Good - Single error handler
if (autoStage) {
  try {
    await stageFiles();
  } catch (error) {
    if (error.message.includes("index.lock")) {
      await handleLock();
    }
  }
}
```

### 2. TypeScript Best Practices
- Use proper typing for LaunchProps
- Avoid `any` types
- Use enums for constants

### 3. Import Organization
```typescript
// ✅ Good order
import { API } from "@raycast/api";
import { useState, useEffect } from "react";
import { localModule } from "./local";
```

---

## 🎨 UI/UX Guidelines

### Action Panel Best Practices
1. **Primary actions first** (Cmd+C for commit)
2. **Group related actions** in sections
3. **Provide keyboard shortcuts** for common actions
4. **Use descriptive titles** without emojis

### Form Guidelines
1. **Clear info messages** without emojis
2. **Helpful placeholders**
3. **Validation feedback**
4. **Error messages should be actionable**

---

## 🤖 AI Integration

### AI Prompt Guidelines
1. **No emojis in prompts**
2. **Clear, structured instructions**
3. **Handle edge cases** (template not found, etc.)
4. **Provide fallbacks**

```typescript
// ✅ Good AI prompt structure
const prompt = `
Output only the Git commit message text, with no extra explanations.

Style: ${styleInstructions}
Repository Context: ${context}

Git Diff:
\`\`\`
${diff}
\`\`\`

Generate the commit message based on the information above.
`.trim();
```

---

## 📦 Package.json Configuration

### Critical Fields
```json
{
  "platforms": ["macOS"],  // Required for macOS-only
  "keywords": [...],        // No gitmoji if not supported
  "commands": [
    {
      "arguments": [        // Optional but useful for deeplinks
        {
          "name": "id",
          "type": "text",
          "required": false
        }
      ]
    }
  ]
}
```

---

## 🔄 Git Operations

### Safe Git Commands
```typescript
// ✅ Use heredoc for commit messages
const command = `git commit -F - <<'EOF'\n${message}\nEOF`;

// ✅ Always specify cwd
await execAsync(command, { cwd: repoPath });

// ✅ Handle errors gracefully
try {
  await GitUtils.commit(path, message);
} catch (error) {
  if (error.message.includes("index.lock")) {
    // Handle lock file
  }
  throw error;
}
```

---

## 🧪 Testing Checklist

Before submitting PR:
- [ ] Run `npm run lint` and fix all issues
- [ ] Run `npm run build` successfully
- [ ] Test with repositories containing special characters
- [ ] Test with long commit messages
- [ ] Test all keyboard shortcuts
- [ ] Verify no emojis in any strings
- [ ] Check all text is in English
- [ ] Verify CHANGELOG uses `{PR_MERGE_DATE}`
- [ ] Test deeplinks if implemented
- [ ] Check timeout values on all execSync calls

---

## 🚨 Common PR Rejection Reasons

1. **Localization violations**: Non-English text found
2. **Emoji usage**: Emojis in code strings
3. **Security issues**: Unsafe command execution
4. **Platform inconsistency**: Windows references when macOS-only
5. **Code duplication**: Repeated logic blocks
6. **Missing timeouts**: execSync without timeout
7. **Unquoted parameters**: Shell injection risks

---

## 📚 Resources

### Official Documentation
- [Raycast API Docs](https://developers.raycast.com)
- [Extensions Repository](https://github.com/raycast/extensions)
- [Style Guide](https://developers.raycast.com/information/style-guide)

### Unofficial Guidelines (This Document)
- Based on actual PR review feedback
- Community-contributed best practices
- Real-world development lessons

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-18 | Initial guidelines based on Auto Git Commit PR reviews |

---

## 💡 Tips for Success

1. **Start with official docs** but expect additional requirements
2. **Study approved extensions** in the store
3. **Review PR feedback** on similar extensions
4. **Test thoroughly** before submitting
5. **Be responsive** to reviewer feedback
6. **Keep it simple** - avoid over-engineering
7. **Document decisions** for future reference

---

## 🤝 Contributing to This Guide

This guide is based on real development experience. If you encounter additional unofficial requirements:

1. Document the issue
2. Document the solution
3. Add example code
4. Update this guide

**Remember**: These guidelines supplement official documentation and may change as Raycast evolves.
