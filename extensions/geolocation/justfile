# List available recipes
default:
    @just --list

# Install dependencies
install:
    npm install

# Run the extension in Raycast with hot reload
dev:
    npm run dev

# Build the extension (including the Swift helper)
build:
    npm run build

# Type-check, then lint with Raycast's ESLint and Prettier setup
check:
    npx tsc --noEmit -p .
    npm run lint

# Fix lint and formatting issues
fix:
    npm run fix-lint
