# Japanese Typing Practice (Raycast Extension)

A Raycast extension for practicing Japanese romaji typing with real-time feedback and history management.

## Overview

### Key Features
- **Real-time Typing Practice**: Practice romaji input with Japanese words and sentences
- **Notation Variation Support**: Supports JIS, Hepburn, and liberal input methods
- **Progress Visualization**: Real-time display of CPM/WPM, accuracy, and consecutive correct hits
- **History Management**: Locally saves practice results and displays statistics
- **Customizable Settings**: Configure practice time, romaji rules, reading display, and more
- **Practice Modes**: Choose between word mode and sentence mode
- **History Retention Settings**: Adjustable number of saved history items (10-300)

### Supported Platforms
- macOS 13+
- Windows 10+
- Latest stable version of Raycast

## Repository Structure

```
src/
├── commands/
│   └── typing.tsx          # Main command entry point
├── views/
│   ├── Practice.tsx        # Practice screen component
│   ├── Result.tsx          # Result display component
│   └── components/         # UI sub-components
├── engine/
│   ├── romanizer.ts        # Romaji conversion engine
│   ├── scorer.ts           # Scoring and metrics calculation
│   └── session.ts          # Session state management (FSM)
├── storage/
│   ├── history.ts          # History saving and retrieval
│   ├── prefs.ts            # Settings management
│   └── schema.ts           # Schema definitions
├── data/
│   └── corpus.ts           # Built-in corpus (words and sentences)
├── types/
│   └── index.ts            # Type definitions
├── utils/
│   └── time.ts             # Time-related utilities
└── test/
    ├── romanizer.test.ts   # Romaji conversion tests
    ├── scorer.test.ts      # Scoring function tests
    ├── session.test.ts     # Session state tests
    ├── corpus.test.ts      # Corpus function tests
    ├── prefs.test.ts       # Settings function tests
    └── __mocks__/          # Test mocks
```

documents/
├── plan/
│   ├── requirements.md     # Requirements definition
│   ├── basic-design.md     # Basic design
│   ├── practice-ui-redesign.md # UI design
│   └── sentence-mode.md    # Sentence mode design

## Setup

### Initial Commands After Repository Clone

```bash
# 1. Prepare Raycast documentation (first time only, recommended)
git clone --depth=1 --filter=blob:none --sparse https://github.com/raycast/extensions.git raycast-ext
cd raycast-ext
git sparse-checkout set docs
cd ..

# 2. Install dependency packages
npm install

# 3. Verify development environment
npm run build
npm run test
npm run lint

# 4. Pre-publish comprehensive check (required)
npm run pre-publish-check

# 5. Start in development mode
npm run dev
```

## Debugging

### Development Environment Setup

1. Prepare Raycast documentation (first time only)

It's recommended to download Raycast's API documentation locally before development:

```bash
git clone --depth=1 --filter=blob:none --sparse https://github.com/raycast/extensions.git raycast-ext
cd raycast-ext
git sparse-checkout set docs
```

This will extract the API reference to `raycast-ext/docs/` for offline reference.

2. Install dependency packages
```bash
npm install
```

3. Start in development mode
```bash
npm run dev
```

### Debugging Steps

1. **Check build errors**
```bash
npm run build
```

2. **TypeScript type checking**
```bash
npx tsc --noEmit
```

3. **ESLint static analysis**
```bash
npm run lint
```

4. **Testing in Raycast**
   - Start Raycast
   - Search for "Japanese Typing Practice"
   - Run the extension directly to verify functionality

### Log Viewing

Development logs can be viewed in Raycast's developer console:
- Raycast menu → Developer → Show Developer Console

## Testing

### Running Unit Tests

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

### Test Targets

- **romanizer**: Romaji conversion engine's notation variation support
- **scorer**: Scoring calculation accuracy
- **session**: Session state transition tests

### Coverage

```bash
npm run test -- --coverage
```

### Manual Test Items

1. **Basic Flow**
   - Start → Practice → Finish → Result display
   - Pause/Resume functionality
   - Skip functionality

2. **Input Validation**
   - JIS/Hepburn notation variations
   - Yoon, sokuon, and chōon processing
   - Case-insensitive input

3. **Settings Functionality**
   - Reflection of various settings
   - History saving and retrieval

## Release Process

### 1. Version Update

```bash
# Update version in package.json
npm version patch  # or minor, major
```

### 2. Build

```bash
npm run build
```

### 3. Run Tests

```bash
npm run test
npm run lint
```

### 4. Pre-publish Comprehensive Check (Required)

**Always run this before updates or publication**:

```bash
npm run pre-publish-check
```

This command automatically verifies:
- Dependency installation
- Lint check (ESLint + Prettier)
- All test execution (54 tests)
- Build success confirmation
- Required items validation in package.json
- Required file existence check (LICENSE, README.en.md, CHANGELOG.md, icon)
- CHANGELOG format validation

### 5. Publish to Raycast Store

```bash
npm run publish
```

### 6. Update CHANGELOG

Document changes in `CHANGELOG.md`:

```markdown
## [1.0.0] - 2025-11-07

### Added
- Japanese typing practice functionality
- Real-time feedback
- History management functionality
- Settings customization functionality

### Fixed
- Describe fixes here
```

### 7. Create Git Tag

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Development Guidelines

### Coding Conventions
- Use TypeScript
- Code formatting with ESLint and Prettier
- Split files by functionality
- Write clear type definitions

### Commit Messages
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code formatting
- `refactor`: Refactoring
- `test`: Test-related

### Branch Strategy
- `main`: Stable version
- `develop`: Development version
- `feature/*`: Feature development

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## Support

If you encounter any issues, please report them via GitHub Issues.