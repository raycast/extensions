# Development Workflow

## Setup (One-time)
1. Install dependencies: `npm install`
2. Import extension to Raycast:
   - Open Raycast → Extensions → Import Extension
   - Select this project folder
   - OR use Extensions → '+' → Add Script Directory

## Build System
This extension uses Raycast's official `ray build` command for compilation.
All build scripts internally use `ray build -e dist` to ensure proper Raycast compatibility.

## Development
1. Start dev mode: `./build.sh dev` (or `npm run dev`)
   - Uses `ray build --watch` for hot reloading
   - Watches for file changes
   - Auto-rebuilds on save
   - Raycast hot-reloads automatically
   - Keep this running while developing

2. Make changes in `src/` files

3. Save - Raycast updates automatically

## Building for Production
- Run `./build.sh` to auto-increment version and build
- Or run `npm run build` to build without version bump
- Creates optimized builds in `dist/` using `ray build`

## Versioning
- `./build.sh` - Increments patch version and builds
- Version is managed in `package.json`
- Updates both version field and description

## Best Practices
- Use `./build.sh dev` during development (hot reload)
- Use `./build.sh` for production builds (auto-increments version)
- Use `npm run build` when you need to build without changing version
- Test changes immediately in Raycast
- No need to reinstall extension between changes
