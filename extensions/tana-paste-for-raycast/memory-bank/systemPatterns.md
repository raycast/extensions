# System Patterns

## Architecture Overview
Tana Paste has two primary implementations:
1. **Raycast Extension**: TypeScript-based for daily quick conversions
2. **Python Script**: For large files and batch processing

The system follows a modular design with clear separation of concerns between UI logic and conversion logic.

## Raycast Extension Architecture
```
├── src/
│   ├── utils/
│   │   ├── tana-converter.ts     # Core conversion logic
│   │   └── __tests__/           # Unit tests
│   ├── quick-clipboard-to-tana.tsx  # No-UI mode
│   ├── paste-and-edit.tsx         # Edit interface
│   └── selected-to-tana.tsx      # Selected text mode
```

## Component Relationships
- **Command Handlers**: Each `.tsx` file handles a specific command entry point
  - `quick-clipboard-to-tana.tsx`: Converts clipboard without UI
  - `paste-and-edit.tsx`: Provides editing interface before conversion
  - `selected-to-tana.tsx`: Converts currently selected text
- **Conversion Logic**: Centralized in `tana-converter.ts`
  - Shared between all command handlers
  - Implements parsing, transformation, and output generation

## Design Patterns
- **Functional Programming**: Pure functions for transformation logic
- **Command Pattern**: Each entry point is a distinct command
- **Strategy Pattern**: Different conversion strategies for different content types
- **Module Pattern**: Clear separation of conversion logic from UI
- **Factory Pattern**: Used for creating appropriate node structures

## Data Flow
1. **Input Acquisition**: Get text from clipboard or selection
2. **Parsing**: Convert text to structured representation
3. **Transformation**: Apply Tana-specific formatting rules
4. **Output Generation**: Format as Tana paste content
5. **Delivery**: Copy to clipboard and notify user

## Key Technical Decisions
- **TypeScript** with strict typing for robust code quality
- **Functional approach** for clarity and testability
- **Regex-based parsing** for efficient text transformation
- **Centralized conversion logic** to maintain consistency
- **Comprehensive testing** to ensure conversion accuracy
- **Python alternative** for performance with large files 
