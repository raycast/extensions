# Changelog

All notable changes to the Mock Data Generator extension will be documented in this file.

## [1.0.0] - 2025-11-27

### 🎉 Initial Release

#### Added
- **Java Support**
  - POJO Classes with getters and setters
  - Records (Java 14+)
  - Builder Pattern implementation
  
- **Python Support**
  - Dictionaries with mock values
  - Dataclasses with type annotations
  - Pydantic Models with BaseModel

- **Core Features**
  - Dynamic field management (add/remove fields)
  - 5 supported data types: String, Integer, Boolean, Date, Array
  - Custom class/object naming
  - Live code preview with syntax highlighting
  
- **Quick Templates**
  - User template (id, username, email, isActive)
  - Product template (id, name, price, inStock)
  - Blog template (id, title, content, publishedDate, tags)

- **Developer Experience**
  - One-click copy to clipboard
  - Paste directly into editor
  - Cross-platform keyboard shortcuts (Mac & Windows)
  - Clean, properly formatted code generation
  - Intuitive form-based UI

#### Keyboard Shortcuts
- Generate & Preview: `Cmd/Ctrl+G`
- Add Field: `Cmd/Ctrl+N`
- Remove Last Field: `Cmd/Ctrl+Backspace`
- Load Templates: `Cmd/Ctrl+Shift+U/P/B`
- Copy to Clipboard: `Cmd/Ctrl+C`
- Back to Form: `Cmd/Ctrl+B`

---

## [Unreleased]

### Planned Features
- TypeScript support (interfaces, types, classes)
- Go support (structs)
- C# support (classes, records)
- Test framework support (JUnit, pytest, Jest)
- Realistic mock data generation
- Export to file functionality
- Import from JSON schema
- More field types (Float, Double, UUID, Email, etc.)
- Custom templates
- Field validation

---

**Note:** This project follows [Semantic Versioning](https://semver.org/).
