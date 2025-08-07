# 🔮 Git Wizard — Raycast Extension

**Git Wizard** is a Raycast extension that helps you craft clean, conventional Git messages — from commits to pull requests — with speed and style.

## 🚀 Features

- **Commit message generator**:

  - Enforces best practices:
    - Imperative mood
    - Capitalized
    - Max 50 characters
    - No trailing period
  - Optional body with 72-character soft wrap
  - Bullet-point list for key changes
  - Issue reference selector (`See`, `Fixes`, `Closes`, etc.)
  - Real-time preview and instant clipboard copy

- **Pull request description generator**:
  - Pre-formatted output with sections for summary, changes, screenshot, and issue
  - Validates summary length, mood, and format
  - Dynamically expands bullet list
  - Optional screenshot section toggle
  - Clean Markdown output with preview

## 🧠 Smart Defaults

Follows conventional commit and PR hygiene guidelines — so you can focus on your code, not your formatting.

## 💬 Output Formats

### ✅ Commit Example

```
feat: Add login form validation

- Add validation schema for email/password
- Show error messages under fields

Fixes #42
```

### ✅ Pull Request Example

```
## Summary

Add login form validation for better UX.

## Changes

- Add validation schema for email/password
- Show error messages under fields

## Screenshot

[]

## Issue

Fixes #42
```

## 🛠 Tech Stack

- [Raycast API](https://developers.raycast.com/)
- React + TypeScript
- Zero backend, zero bloat

## 🧪 How to Use

1. Clone the repo:

   ```bash
   git clone https://github.com/juanmartinlopeze/git-wizard.git
   cd git-wizard
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run a command locally in Raycast:

   ```bash
   ray run src/commit.tsx       # For commit messages
   ray run src/pull-request.tsx           # For pull request messages
   ```

## 📁 Project Structure

```
GIT-WIZARD/
├── assets/                          # Icons or visuals
│   └── wizard-icon.png
├── node_modules/
├── src/
│   ├── commit.tsx                  # Git commit message generator
│   └── pull-request.tsx                      # Pull request message generator
├── .gitignore
├── .prettierrc
├── CHANGELOG.md
├── eslint.config.js
├── package-lock.json
├── package.json
├── raycast-env.d.ts
├── tsconfig.json
└── README.md
```

## 📜 License

MIT — free to use, remix, or adapt.

## 🙌 Acknowledgments

Inspired by [A Note About Git Commit Messages](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html), the Raycast developer community, and the principle that clarity is kindness — even in commits.

---

Built by [Martín López](https://github.com/juanmartinlopeze) — feedback and PRs welcome!
