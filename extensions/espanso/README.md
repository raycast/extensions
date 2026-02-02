# Espanso

The Raycast version of Espanso Search Bar

## Features

- 🔍 Search and browse all your Espanso matches
- 📁 Organize matches by categories (folders)
- 👤 Filter by profiles (work, home, etc.)
- 🏷️ View triggers, labels, and metadata
- 📋 Paste directly to frontmost app or copy to clipboard

## Organization

### Categories

Use folders to organize your matches into categories:

```
match/
  dev/
    snippets.yml
  writing/
    templates.yml
```

Nested folders create breadcrumb categories: `match/dev/tools/git.yml` → **Dev · Tools**

### Profiles

Organize matches by context using the `profiles/` folder:

```
match/
  profiles/
    work/
      dev/
        snippets.yml
      email/
        templates.yml
    home/
      personal/
        notes.yml
```

Matches in `profiles/work/dev/snippets.yml` will:
- Show **"Work"** as the profile in the UI
- Belong to the **"Dev"** category
- Be filterable by both profile and category

Matches outside `profiles/` are accessible from all contexts.

## Settings

- **Espanso Binary Path**: Custom path to espanso binary (optional)
- **Breadcrumb Separator**: Customize the character used to separate category levels (default: `·`)
  - Examples: `·` (default), `/`, `>`, `→`, `›`, `»`

## Tips

- Matches with multiple triggers (e.g., `triggers: [":hello", ":hi"]`) appear as a single item with all triggers displayed
- Use the profile dropdown to quickly switch between work and personal snippets
- Categories are automatically sorted with "base" categories appearing first
- Customize your breadcrumb separator in the extension settings to match your style preference
