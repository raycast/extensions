# URL Editor Pro Changelog

## [1.1.0] - 2025-12-19

### New Features

- **URL Template Variants**: Generate multiple URL variants from a single URL using customizable templates
  - Mustache-style `{{variable}}` syntax
  - Built-in variables: `url`, `protocol`, `host`, `hostname`, `port`, `path`, `query`, `hash`
  - Path level selection: `{{path:N}}` (positive index from start)
  - Python-style negative index: `{{path:-N}}` (remove from end)
  - Path hierarchy expansion: `{{path:*}}` (generate all path levels)
- **Template Manager**: Create, edit, duplicate, enable/disable, and delete template groups
- **Default Template Groups**: Shorten URL, Remove Query Parameters, Path Hierarchy
- **Quick Actions Brief**: Display keyboard shortcuts guide on home screen

### Keyboard Shortcuts

- `⌘⇧V` - Generate URL variants
- `⌃⇧T` - Manage template groups (available on all URL items)
- `⌘⇧E` - Enable/Disable template group (in Template Manager)

### Improvements

- Refactored code structure with modular organization:
  - `src/template/` - Template system modules
  - `src/qrcode/` - QR code related components
  - `src/editor/` - URL edit form
  - `src/brief/` - Usage guides and shortcuts
- Extracted reusable `templateEntryAction` component
- Improved template form with variable hints

### Bug Fixes

- Fixed QR code image loading failure after pressing ESC (moved QR generation into component lifecycle)
- QR code image failed to save

---

## [Initial Version] - 2025-06-16

- Add `Url Editor` command
