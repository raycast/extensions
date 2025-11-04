# NumPy Documentation Search Changelog

## [1.2.3] - 2025-10-09

### Changed
- Refresh README to focus on a concise Raycast user overview with key in-app features

## [1.2.2] - 2025-10-07

### Fixed
- Fix TypeScript compilation errors in strict mode
  - Updated Cheerio type annotations to use `Cheerio<AnyNode>` with proper imports from domhandler
  - Added explicit type annotations for `.each()` callback parameters to resolve implicit any errors
  - Fixed `onSelectionChange` handler type mismatch by properly converting null to undefined

## [1.2.1] - 2025-10-07

### Fixed
- Remove ufunc assignment notation from function signatures - Universal function signatures no longer show `= <ufunc 'name'>` suffix

## [1.2.0] - 2025-10-07

### Added
- **Prefix Toggle Preference**: New user preference to display 'np.' instead of 'numpy.' prefix throughout the extension
  - Default setting uses 'np.' prefix (e.g., 'np.array' instead of 'numpy.array')
  - Applies to search results (title and subtitle), function signatures, and all action menus
  - Can be toggled in Raycast extension preferences: "Use Short Prefix" checkbox
  - Affects display only - does not change underlying functionality or URLs

## [1.1.1] - 2025-10-07

### Fixed
- Remove hash fragments from documentation URLs - URLs now open to the clean page URL (e.g., `https://numpy.org/doc/stable/reference/generated/numpy.absolute.html`) instead of including the anchor fragment (e.g., `https://numpy.org/doc/stable/reference/generated/numpy.absolute.html#numpy.absolute`)

## [1.1.0] - 2025-10-07

### Fixed
- Preserve inline code blocks in parameter descriptions - code references like `endpoint`, `False`, and `num + 1` now appear with proper backtick formatting instead of plain text

## [1.0.0] - 2025-10-07

### Added

- **Core Search Functionality**: Real-time search through NumPy Sphinx inventory with intelligent ranking
  - Prefix matching prioritization for accurate results
  - Short name search support (search "norm" to find "numpy.linalg.norm")
  - Filters out private members (functions/methods starting with `_` or `__`)
- **Documentation Display**: Rich documentation preview inside Raycast
  - Function/method signatures formatted as Python code blocks
  - Parameter lists with type annotations and descriptions
  - Return value documentation
  - Descriptive summaries extracted from official NumPy docs
- **Sphinx Inventory Integration**: Automatic loading and caching of NumPy API reference
  - Supports multiple Python object types (functions, methods, classes, attributes, properties, modules, exceptions)
  - Deduplication and filtering for clean search results
  - Direct links to official numpy.org documentation
- **User Actions**: Quick access to documentation and metadata
  - View full documentation in expanded detail view
  - Open official docs in browser
  - Copy URL, qualified name, or signature to clipboard
- **Test Coverage**: Comprehensive test suite for reliability
  - Search ranking and filtering tests
  - HTML documentation parsing tests
  - Inventory loading and deduplication tests
  - Fixtures mirroring NumPy documentation structure
