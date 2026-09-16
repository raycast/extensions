# Contributing to Browser Router

First off, thank you for considering contributing to Browser Router! Open source contributions make tools better for everyone.

---

## Getting Started

### Prerequisites
- **Operating System**: Windows 10 or Windows 11 (Browser Router is engineered specifically for the Windows desktop ecosystem).
- **Raycast for Windows**: Latest version of [Raycast](https://raycast.com).
- **Node.js**: Version 18.x or higher.
- **npm**: Included with Node.js.

### Local Setup
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/raghavg02/browser-router.git
   cd browser-router
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Raycast development server:
   ```bash
   npm run dev
   ```
   Raycast will detect the extension in developer mode and load it immediately into your Raycast root search.

---

## Development Workflow

### Available Scripts

- **`npm run dev`**: Starts `ray develop` to hot-reload changes as you edit TypeScript/React source files.
- **`npm run lint`**: Runs `ray lint` to validate `package.json`, extension icons, store metadata, ESLint rules, and Prettier formatting.
- **`npm run fix-lint`**: Automatically fixes formatting and style issues using Prettier and ESLint.
- **`npm run build`**: Compiles the extension bundle and runs the postbuild step to ensure compatibility.

### Verification Checklist Before Submitting a PR
- [ ] Code compiles cleanly with `npm run build`.
- [ ] `npm run lint` passes with 0 errors.
- [ ] No hardcoded machine paths (e.g., `C:\Users\...`) or personal identifiers.
- [ ] Tested with at least two different Chromium browsers (e.g., Chrome, Edge, Brave, Vivaldi).
- [ ] Keyboard shortcuts and navigation flow remain intact.

---

## Pull Request Guidelines

1. Create a feature branch (`git checkout -b feature/your-feature-name`).
2. Keep commits descriptive and atomic.
3. Push to your fork and submit a Pull Request to the `main` branch.
4. Provide a clear summary of what your PR introduces and how it was tested on Windows.

---

## Code of Conduct

Please review and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) in all project interactions.
