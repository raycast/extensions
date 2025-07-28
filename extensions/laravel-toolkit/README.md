# Laravel Toolkit for Raycast 🚀

A handy Raycast extension that brings common Laravel tasks to your fingertips. Add projects, run `php artisan` commands, and inspect routes without ever leaving Raycast.

## Features

- **Add Project** – register your Laravel projects so the extension knows where to run commands.
- **Set Active Project** – quickly switch between projects.
- **Cache Clear** – wipe all Laravel caches (`cache`, `config`, `route`, and `view`).
- **Migrate** – run your database migrations.
- **Route List** – browse and copy route info in a friendly list.
- **Artisan Commands** – view and copy available artisan commands.
- **Run Artisan Command** – execute any artisan command with validation.
- **Run Tests** – launch your Laravel test suite.
- **Tail Log** – view the `laravel.log` file in real time.
- **Composer Install** – install PHP dependencies using Composer.
- **Composer Update** – update PHP dependencies using Composer.
- **Open Project in Editor** – open the active project in your preferred editor (macOS, Windows, and Linux supported).
- **Project List** – manage and remove registered projects.
- **Discover Projects** – scan folders to automatically find Laravel apps.
- **Environment Manager** – edit `.env` files and switch between environments.
- **Serve** – run `php artisan serve` to start the local development server.
- **Queue Work** – run `php artisan queue:work` in an external terminal.

## Installation

1. Clone this repo.
2. Run `npm install` to grab dependencies.
3. Start dev mode with `npm run dev` and Raycast will automatically load the extension.
4. If PHP isn't in your PATH, set a custom path in Raycast extension preferences.
5. Optionally set a **Composer Path** if Composer isn't available globally.
6. Provide your **Editor Path** to open projects in your favorite editor.

## Usage


Open Raycast and search for any command starting with `Laravel:`. When prompted to pick a project, use **Add Project** first. Manage existing projects from **Project List** or scan for new ones with **Discover Projects**. Swap between projects with **Set Active Project**, then run your migrations, tests, or any custom artisan command directly from Raycast.

## Development Tips

- The code lives in `src/` (commands) and `lib/` (helpers).
- Lint changes with `npm run lint` before committing.
- For a deeper dive into Raycast extension development, check `extension-development-overview.md`.

## Git Hooks

This project uses **husky** to run checks before each commit. The `pre-commit` hook
skips when only Markdown files or comment changes are staged. Otherwise it runs
`npm run lint` followed by the test script in `run-tests.tsx`.

#### See Also

- https://developers.raycast.com/basics/prepare-an-extension-for-store
- https://developers.raycast.com/basics/publish-an-extension
- https://developers.raycast.com/basics/prepare-an-extension-for-store#metadata-and-configuration

**Key Terms:**  
**Related Topics:**

## License

[MIT](https://opensource.org/licenses/MIT)
