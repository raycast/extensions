<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Project Opener Icon">
</p>

<h1 align="center">Project Opener</h1>

<p align="center">
  <strong>Quickly open projects from your projects directory in your preferred IDE</strong>
</p>

<p align="center">
  A Raycast extension that scans your projects directory and lets you instantly open any project in your favorite editor.
</p>

---

## Features

- **Automatic Project Detection** - Scans directories and identifies projects by common markers like `.git`, `package.json`, `Cargo.toml`, and more
- **Universal Language Support** - Works with JavaScript/TypeScript, Rust, Go, Python, Java, C/C++, and any project with standard build files
- **Fuzzy Search** - Quickly filter through your projects as you type
- **Per-Project Customization** - Set custom display names, icons, and IDE overrides for individual projects
- **Configurable Depth** - Control how deep the scanner searches (1-4 levels)

## Supported Project Types

Projects are detected by the presence of any of these markers:

| Marker | Ecosystem |
|--------|-----------|
| `.git` | Any version-controlled project |
| `package.json` | Node.js / JavaScript / TypeScript |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `pyproject.toml` | Python |
| `pom.xml` | Java (Maven) |
| `build.gradle` | Java / Kotlin (Gradle) |
| `CMakeLists.txt` | C / C++ |
| `Makefile` | Various |

## Installation

1. Open Raycast
2. Search for "Store" and open the Raycast Store
3. Search for "Project Opener"
4. Click Install

Or install from source:

```bash
git clone <repository-url>
cd project-opener
bun install
bun run dev
```

## Configuration

### Extension Preferences

Configure these settings in Raycast Preferences under Extensions > Project Opener:

| Setting | Description | Default |
|---------|-------------|---------|
| **IDE Application** | The application used to open projects | *Required* |
| **Projects Directory** | Root directory containing your projects | `~/Documents/projects` |
| **Search Depth** | How many levels deep to scan for projects (1-4) | 2 levels |

### Per-Project Settings

Each project can have its own custom settings, accessible via `Cmd + Shift + ,` when a project is selected:

| Setting | Description |
|---------|-------------|
| **Display Name** | Custom name shown in the project list (instead of folder name) |
| **Icon** | Choose from any Raycast icon to visually distinguish projects |
| **IDE Override** | Open this specific project with a different application |

Per-project settings are persisted locally and survive extension updates.

## Actions

When a project is selected, the following actions are available:

| Action | Shortcut | Description |
|--------|----------|-------------|
| Open in IDE | `Enter` | Opens the project in your configured IDE |
| Show in Finder | `Cmd + Enter` | Reveals the project folder in Finder |
| Copy Path | `Cmd + Shift + C` | Copies the full project path to clipboard |
| Project Settings | `Cmd + Shift + ,` | Opens per-project customization form |

## Development

```bash
bun run dev       # Start development mode with hot reload
bun run build     # Build the extension
bun run lint      # Run ESLint
bun run fix-lint  # Auto-fix linting issues
bun test          # Run tests
```

## License

MIT
