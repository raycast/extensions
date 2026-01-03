# Laravel Documentation for Raycast

The ultimate Laravel developer toolkit for Raycast. Quickly access documentation, browse Artisan commands, copy code snippets, create new projects, and run commands—all without leaving your keyboard.

![Laravel Extension](assets/extension-icon.png)

## Features

### 📚 Search Laravel Docs

Instantly search and browse the official Laravel documentation with powerful features:

- **68+ documentation pages** organized by category (Getting Started, The Basics, Security, Database, and more)
- **17 Laravel versions** supported (Master through 5.0)
- **Favorites system** to bookmark your most-used pages
- **Recent pages** tracking for quick access to recently viewed docs
- **Laracasts integration** with direct links to video tutorials

### ⚡ Artisan Commands Reference

Browse all 70+ Laravel Artisan commands organized by category:

- Make commands (Controllers, Models, Migrations, etc.)
- Database commands (Migrate, Seed, Rollback)
- Cache commands (Clear, Optimize)
- Queue commands (Work, Listen, Restart)
- Route commands (List, Cache, Clear)
- And many more!

Copy any command to your clipboard with a single keystroke.

### 📝 Laravel Snippets

Access 30+ ready-to-use code snippets for common Laravel patterns:

- **Routes** - Basic routes, resource routes, API routes, route groups
- **Models** - Eloquent relationships, scopes, accessors, mutators
- **Controllers** - Resource controllers, API controllers, invokable controllers
- **Migrations** - Table creation, columns, indexes, foreign keys
- **Validation** - Form requests, inline validation, custom rules
- **Blade** - Layouts, components, directives, conditionals

### 🚀 Create Laravel Project

Create new Laravel projects directly from Raycast:

- Choose your **starter kit** (None, Breeze, or Jetstream)
- Select your preferred **database** (SQLite, MySQL, PostgreSQL, SQL Server)
- Configure **Git initialization**
- Opens the project folder automatically when complete

### 🔧 Run Artisan Commands

Execute Artisan commands in your Laravel project without opening a terminal:

- **Common** - Serve, Tinker, Route List
- **Database** - Migrate, Fresh, Seed, Rollback
- **Cache** - Clear All, Cache Config/Routes/Views
- **Queue** - Work, Listen, Restart
- **Testing** - Run Tests, Parallel Testing

## Installation

1. Open Raycast
2. Search for "Laravel Documentation" in the Store
3. Click Install

Or install manually:

```bash
git clone https://github.com/your-username/laravel-documentation.git
cd laravel-documentation
npm install
npm run dev
```

## Configuration

Open Raycast preferences (`⌘ + ,`) and configure:

| Preference                    | Description                             | Default       |
| ----------------------------- | --------------------------------------- | ------------- |
| **Laravel Version**           | Which version's documentation to browse | 12.x (Latest) |
| **Always open in new tab**    | Open docs in browser vs copy URL        | Enabled       |
| **Laravel Project Directory** | Path for running Artisan commands       | -             |

## Usage

### Keyboard Shortcuts

| Command                  | Description                      |
| ------------------------ | -------------------------------- |
| `Search Laravel Docs`    | Search and browse documentation  |
| `Artisan Commands`       | Browse all Artisan commands      |
| `Laravel Snippets`       | Copy code snippets               |
| `Create Laravel Project` | Start a new Laravel project      |
| `Run Artisan Command`    | Execute commands in your project |

### Quick Actions

- **⌘ + ⏎** - Primary action (Open/Run/Copy)
- **⌘ + ⇧ + C** - Copy to clipboard
- **⌘ + ⇧ + F** - Add to favorites
- **⌘ + ⇧ + L** - Open on Laracasts

## Supported Laravel Versions

| Version   | Status        |
| --------- | ------------- |
| Master    | Beta          |
| 12.x      | Latest        |
| 11.x      | LTS           |
| 10.x      | Supported     |
| 9.x       | Supported     |
| 8.x       | Security Only |
| 7.x - 5.0 | Legacy        |

## Requirements

- [Raycast](https://raycast.com/) (macOS/Windows)
- For "Create Laravel Project": [Laravel Installer](https://laravel.com/docs/installation#the-laravel-installer) or Composer
- For "Run Artisan": PHP and a Laravel project

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Created by **jasper_huppertz**

---

Made with ❤️ for the Laravel community
