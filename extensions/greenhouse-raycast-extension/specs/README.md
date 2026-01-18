# Specs

Requirements for the next iteration of the Greenhouse Raycast extension.

## Spec Files

| File | Topic | Complexity |
|------|-------|------------|
| `direct-launch.md` | Skip root menu, open jobs directly | Small |
| `stage-counts.md` | Show applicant counts in stage headings | Small |
| `caching.md` | Add caching + background refresh | Medium |

## Manual Tasks (Not Automated)

These require human action:

- **Extension icon**: Download official Greenhouse logo (512x512 PNG), save to `assets/command-icon.png`, update manifest references. Must look good in light/dark themes.

## Priority Order

1. `direct-launch.md` - Quick win, improves UX immediately
2. `stage-counts.md` - Quick win, visual improvement
3. `caching.md` - Larger change, requires new dependency
