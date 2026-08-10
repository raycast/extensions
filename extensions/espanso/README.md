# Espanso

The Raycast version of Espanso Search Bar

## Features

- 🔍 **Search & Browse** - Quickly search and browse all your Espanso matches
- 📁 **Smart Categories** - Organize matches by folders with full breadcrumb navigation
- 👤 **Profile Support** - Filter matches by context (work, home, etc.) using the profiles folder
- 🏷️ **Rich Metadata** - View triggers, labels, categories, and custom metadata
- 📋 **Quick Actions** - Paste directly to frontmost app or copy to clipboard
- ⚡ **Live Preview** - Dynamic matches (date, shell, script, random, clipboard) are evaluated and shown as real content in the preview panel
- 🖼️ **Image Matches** - Image matches render inline in the preview with a one-click copy action
- 🔄 **Re-evaluate** - Refresh dynamic match values on demand directly from the action panel
- 🎨 **Customizable UI** - Choose your preferred breadcrumb separator character
- 🔤 **Proper Formatting** - Intelligent acronym handling (AI, API, UI, etc.) for professional display

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
- Category names automatically format common acronyms correctly (AI, API, UI, UX, HTML, CSS, etc.)
- Files named `index.yml` in subdirectories won't show redundant subcategory labels

## Development

This extension includes TypeScript type checking for improved code quality:

```bash
npm run typecheck
```
