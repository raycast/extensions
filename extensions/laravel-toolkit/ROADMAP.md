# Laravel Toolbox – Roadmap

This roadmap outlines current capabilities, planned improvements, and potential future features for the Laravel Toolbox Raycast extension.

---

## ✅ Current Features (Implemented)

- **Project Management**
    - Add Project
    - Set Active Project
    - List & Remove Projects
    - Discover Projects

- **Laravel Commands**
    - Run Migrations
    - Run Tests
    - Cache Clear (config, view, route, etc.)
    - Serve (`php artisan serve`)
    - Queue Work (`php artisan queue:work`)
    - Run Any Artisan Command (validated)
    - List Available Artisan Commands

- **UX & Developer Tools**
    - Route List (formatted, copyable)
    - Tail `laravel.log`
    - Open Project in Editor

- **Environment Management**
    - Edit `.env` files
    - Switch environment files

- **Composer**
    - Composer Install
    - Composer Update

---

## 📍 From Existing `ROADMAP.md`

- **Remote Project Support** – Run commands inside containers or via SSH

---

## 🧠 Developer Utilities

| Feature | Description | Feasibility |
|--------|-------------|-------------|
| ✅ Ad-hoc Artisan Runner | Already implemented via `Run Artisan Command` | ✔️ |
| Artisan Command Picker | Autocomplete/categorized `php artisan list` interface | ✅ Easy |
| Run Seeder | Run `php artisan db:seed` or specific seeder class | ✅ Easy |
| Log Search | Filter/search recent `laravel.log` output | 🔶 Medium |
| Cache Warm-up | `php artisan config:cache`, `route:cache`, etc. | ✅ Easy |

---

## 🧪 Testing & Validation

| Feature | Description | Feasibility |
|--------|-------------|-------------|
| Test Selector | Run specific tests by file/class/method | 🔶 Medium |
| Pest Support | Run Pest instead of PHPUnit if available | ✅ Easy |
| `.env` Validator | Compare `.env` against `.env.example` | 🔶 Medium |

---

## 📂 Filesystem & Code UX

| Feature | Description | Feasibility |
|--------|-------------|-------------|
| Controller/Model Finder | Jump to file from route/controller name | 🔶 Medium |
| Blade File Opener | Locate and open Blade views by name | 🔶 Medium |
| Migration Creator | Create migration via form (name/table) | 🔶 Medium |

---

## 🌍 Remote & Contextual Support

| Feature | Description | Feasibility |
|--------|-------------|-------------|
| Valet Support | Detect Valet-based Laravel installs | ✅ Easy |
| Docker Context | Run inside `docker-compose exec` | ⚠️ Complex |
| SSH Support | Execute Artisan remotely via SSH | ⚠️ Complex |

---

## 🧩 Raycast-Specific Features

| Feature | Description | Feasibility |
|--------|-------------|-------------|
| Quick Actions Launcher | Unified shortcut to all Laravel actions | ✅ Easy |
| Artisan Command Cache | Cache `php artisan list` output | 🔶 Medium |

---

## ❌ Out of Scope (Short-Term)

| Feature | Reason |
|--------|--------|
| Full Tinker REPL | Raycast not designed for REPLs |
| Graphical DB Viewer | Better served via external tools |
| Laravel Nova UI | Not CLI-accessible |

---

## Next Steps

- [ ] Convert to tasks/issues or Notion cards
- [ ] Prioritize quick wins for v1.1
- [ ] Gather feedback on remote project needs
