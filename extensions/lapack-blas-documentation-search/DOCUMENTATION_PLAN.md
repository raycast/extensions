# Plan for Obtaining and Managing LAPACK/BLAS Documentation URLs

## Overview

This document describes how to obtain, validate, and manage the URLs for LAPACK/BLAS documentation in this extension.

## Current Implementation

The extension uses a **local-first approach** where:
1. All documentation is stored as markdown files in the `assets/docs/` directory
2. A JSON inventory file (`assets/assets/docs/inventory.json`) maps function names to their documentation files and official URLs
3. No web access is required during runtime - everything is bundled with the extension

## Sources for LAPACK/BLAS Documentation URLs

### Primary Source: Netlib

The official LAPACK documentation is available at:
- **Base URL**: https://netlib.org/lapack/explore-html/
- **Structure**: Documentation is organized by function groups with stable URLs

### URL Pattern Examples

BLAS routines follow predictable patterns:
- Double precision Level 1: `https://netlib.org/lapack/explore-html/d[X]/d[Y]/group__[operation]_[hash].html`
- Example: DAXPY → `https://netlib.org/lapack/explore-html/d9/dcd/group__axpy_ga4e86fd6e5a2b3c92e4c27f3d8b16c67f.html`

LAPACK routines:
- Driver routines: `https://netlib.org/lapack/explore-html/d[X]/d[Y]/group__[operation]_[hash].html`
- Example: DGESV → `https://netlib.org/lapack/explore-html/d8/d72/group__gesv_ga2f6898125dc5e6c827d0d06dcc5e3e79.html`

## Obtaining New Documentation URLs

### Method 1: Manual Search (Recommended for Initial Setup)

1. Navigate to https://netlib.org/lapack/explore-html/
2. Use the search function to find the routine
3. Copy the URL from the browser's address bar
4. Add to `assets/docs/inventory.json`

### Method 2: Automated Scraping (For Bulk Updates)

If you need to add many routines, you can create a scraper:

```javascript
// example-scraper.js
const cheerio = require('cheerio');
const https = require('https');

async function findRoutineUrl(routineName) {
  // Search Netlib's documentation
  const searchUrl = `https://netlib.org/lapack/explore-html/search.html?q=${routineName}`;
  
  // Parse search results
  // Extract the direct link to the routine documentation
  // Return the URL
}

// Usage:
// findRoutineUrl('dgemm').then(url => console.log(url));
```

### Method 3: LAPACK Repository Parsing

The LAPACK source code repository contains documentation comments:
- Repository: https://github.com/Reference-LAPACK/lapack
- Each routine has header comments describing parameters and behavior
- These can be converted to markdown format

## Workflow for Adding New Routines

### Step 1: Identify the Routine

Choose a routine to add (e.g., `dgeev` for eigenvalue computation).

### Step 2: Find the Official URL

1. Visit https://netlib.org/lapack/explore-html/
2. Search for the routine name
3. Navigate to the documentation page
4. Copy the full URL

### Step 3: Create Documentation

Option A - Manual:
1. Read the official documentation
2. Create a markdown file in `docs/` directory
3. Include: purpose, signature, parameters, returns, notes

Option B - Automated:
```bash
# Download and convert HTML to markdown
curl -s [URL] | pandoc -f html -t markdown > assets/docs/routine-name.md
# Then manually clean up and format
```

### Step 4: Update Inventory

Add an entry to `assets/docs/inventory.json`:

```json
{
  "id": "routine-name",
  "name": "routine-name",
  "role": "blas:routine" | "lapack:driver" | "lapack:computational",
  "category": "BLAS Level 1" | "LAPACK Linear Equations" | etc.,
  "url": "https://netlib.org/lapack/...",
  "docPath": "routine-name.md",
  "description": "Brief description (1 line)"
}
```

### Step 5: Test

```bash
npm run build
npm run dev
# Search for the new routine in Raycast
```

## URL Validation

To ensure URLs remain valid:

### Validation Script

Create a script to check all URLs in inventory:

```javascript
// validate-urls.js
const inventory = require('./assets/docs/inventory.json');
const https = require('https');

async function validateUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

async function validateAllUrls() {
  for (const item of inventory) {
    const valid = await validateUrl(item.url);
    console.log(`${item.name}: ${valid ? 'OK' : 'BROKEN'}`);
  }
}

validateAllUrls();
```

Run periodically to catch broken links.

## URL Update Strategy

### Quarterly Review
- Check if Netlib has updated their documentation structure
- Run URL validation script
- Update any broken links

### Version Tracking
- Document the LAPACK version the URLs correspond to
- Add a field to inventory.json if needed:
  ```json
  "lapackVersion": "3.11"
  ```

### Fallback Strategy
If Netlib URLs change:
1. Check if there's a redirect (usually there is)
2. Update URLs in inventory.json
3. Consider caching the documentation locally
4. Document the change in CHANGELOG.md

## Future Enhancements

### Automated Documentation Generation

Create a pipeline to:
1. Clone the LAPACK repository
2. Parse Fortran documentation comments
3. Convert to markdown using a template
4. Generate inventory.json automatically
5. Validate against Netlib URLs

### Documentation Updates

Set up a GitHub Action to:
1. Check for new LAPACK releases
2. Compare with current inventory
3. Generate PRs for new routines
4. Validate existing URLs

### Additional Sources

Consider adding documentation from:
- Intel MKL documentation (if licensing permits)
- BLAS Technical Forum documentation
- Community-contributed examples and use cases

## Maintenance Checklist

- [ ] Quarterly: Run URL validation script
- [ ] Yearly: Check for new LAPACK/BLAS releases
- [ ] As needed: Add commonly requested routines
- [ ] Monitor: User feedback on missing routines
- [ ] Update: Keep markdown documentation accurate and comprehensive

## Resources

- LAPACK Documentation: https://netlib.org/lapack/
- LAPACK GitHub: https://github.com/Reference-LAPACK/lapack
- BLAS Documentation: https://netlib.org/blas/
- LAPACK Users' Guide: https://www.netlib.org/lapack/lug/

## Contact

For questions about documentation or to suggest additions, please open an issue on the repository.
