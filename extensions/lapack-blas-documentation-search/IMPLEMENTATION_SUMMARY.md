# LAPACK/BLAS Documentation Search - Implementation Summary

## Overview

This Raycast extension provides instant access to LAPACK/BLAS documentation without requiring an internet connection. It follows a local-first architecture where all documentation is bundled with the extension.

## Key Features Implemented

### ✅ 1. Local-First Architecture
- All documentation stored locally as markdown files
- No web access required during runtime
- Instant search and retrieval
- Works offline

### ✅ 2. Comprehensive Documentation Database
- **30 LAPACK/BLAS routines** included with full documentation
- Organized by category:
  - BLAS Level 1 (vector operations)
  - BLAS Level 2 (matrix-vector operations)
  - BLAS Level 3 (matrix-matrix operations)
  - LAPACK linear systems
  - LAPACK factorizations (LU, QR, Cholesky)
  - LAPACK eigenvalue and SVD solvers

### ✅ 3. Data Structure
- **inventory.json**: Contains metadata for all routines
  - Function names
  - Descriptions
  - Categories
  - Official documentation URLs
  - Local documentation file paths
- **Markdown files**: One per routine with detailed documentation
  - Function purpose
  - Signatures (Fortran)
  - Parameter descriptions
  - Return values
  - Notes and references

### ✅ 4. Search Functionality
- Smart scoring algorithm that prioritizes:
  - Exact name matches
  - Name prefix matches
  - Partial name matches
  - Description matches
  - Category matches
- Results sorted by relevance
- Real-time search as you type

### ✅ 5. User Interface
- List view with search
- Detail pane showing documentation preview
- Full-screen documentation view
- Actions:
  - View full documentation
  - Open official docs in browser
  - Copy URL to clipboard
  - Copy routine name to clipboard

### ✅ 6. Code Architecture

#### Library Functions (`src/lib/`)
- **inventory.ts**: Loads and manages the function inventory
- **doc-detail.ts**: Loads markdown documentation from local files
- **search.ts**: Implements the search algorithm

#### React Hooks (`src/hooks/`)
- **useInventory.ts**: Loads the inventory on mount
- **useDocDetail.ts**: Loads documentation for selected items

#### Main Component (`src/lapack-blas-docs.tsx`)
- List view with search
- Detail rendering
- Action handlers

## Technical Implementation Details

### File Loading Strategy
```typescript
// Uses Raycast's environment API to access bundled assets
import { environment } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";

const docsPath = join(environment.assetsPath, "docs", item.docPath);
const markdown = readFileSync(docsPath, "utf-8");
```

### JSON Inventory Loading
```typescript
// Direct import of JSON file at build time
import inventoryData from "../../docs/inventory.json";
```

### Build System
- Raycast CLI (`ray`) handles bundling
- All files in `assets/docs/` directory are included automatically
- TypeScript compilation with React JSX support

## Extensibility

### Adding New Routines

1. **Add to inventory** (`assets/docs/inventory.json`):
```json
{
  "id": "routine-name",
  "name": "routine-name",
  "role": "blas:routine",
  "category": "BLAS Level 1",
  "url": "https://netlib.org/...",
  "docPath": "routine-name.md",
  "description": "Brief description"
}
```

2. **Create markdown file** (`assets/docs/routine-name.md`):
```markdown
# ROUTINE-NAME - Description

## Purpose
...

## Signature
...

## Parameters
...
```

3. **Rebuild**:
```bash
npm run build
```

## Documentation Strategy

See `DOCUMENTATION_PLAN.md` for:
- How to obtain documentation URLs
- URL validation strategies
- Automated documentation generation ideas
- Maintenance procedures

## Testing

### Build Verification
```bash
npm run build
# Should complete without errors
```

### Lint Verification
```bash
npm run fix-lint
# Should pass (network errors in sandboxed environment are expected)
```

### Manual Testing
```bash
npm run dev
# Opens Raycast in development mode
# Test search functionality
# Verify documentation displays correctly
```

## Performance

- **Initial Load**: Instant (inventory is <50KB JSON)
- **Search**: Real-time (all operations are in-memory)
- **Documentation Load**: Near-instant (local file reads)
- **No Network Overhead**: Everything is bundled

## Comparison with NumPy Extension

| Feature | NumPy Extension | LAPACK/BLAS Extension |
|---------|----------------|----------------------|
| Data Source | Online API (objects.inv) | Local JSON file |
| Documentation | Scraped from HTML | Pre-written markdown |
| Network Access | Required | Not required |
| Parsing | Complex (Sphinx + HTML) | Simple (JSON + markdown) |
| Speed | Fast (cached) | Instant (local) |
| Offline Support | No | Yes |

## Future Enhancements

### Potential Additions
1. More routines (currently 30, could expand to 200+)
2. Code examples in multiple languages (C, Fortran, Python)
3. Performance characteristics and complexity notes
4. Visual diagrams for matrix operations
5. Related routine suggestions
6. Search by operation type (e.g., "all QR factorizations")

### Automation Opportunities
1. Script to scrape Netlib and generate markdown
2. Automated URL validation
3. Integration with LAPACK repository for auto-updates
4. Community contributions workflow

## Maintenance

### Regular Tasks
- Quarterly URL validation
- Annual check for new LAPACK releases
- Update documentation for accuracy
- Add commonly requested routines

### Monitoring
- Track which routines are searched most
- Identify missing routines users need
- Gather feedback on documentation quality

## References

- LAPACK: https://netlib.org/lapack/
- BLAS: https://netlib.org/blas/
- Raycast Extensions: https://developers.raycast.com/
- Similar Project: NumPy Documentation Search

## License

MIT License - See LICENSE file for details

## Credits

- LAPACK/BLAS documentation from Netlib
- Inspired by NumPy Documentation Search extension
- Built with Raycast Extension API
