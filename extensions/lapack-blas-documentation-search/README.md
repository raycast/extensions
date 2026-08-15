# LAPACK/BLAS Documentation Search

Quickly search through official LAPACK/BLAS documentation directly from Raycast.

## Features

- **Fast Local Search**: Search through 30+ LAPACK/BLAS routines instantly
- **Offline Documentation**: All documentation is stored locally as markdown files - no internet connection required
- **Quick Access**: View function signatures, parameters, and descriptions without leaving Raycast
- **Open in Browser**: Jump to the official online documentation when needed

## Usage

1. Open Raycast
2. Search for "LAPACK/BLAS Docs"
3. Type the name of a LAPACK or BLAS routine (e.g., "dgemm", "dgesv", "daxpy")
4. View the documentation inline or press Enter to see the full documentation
5. Use the actions menu to:
   - View full documentation
   - Open in browser
   - Copy URL
   - Copy routine name

## Included Routines

This extension currently includes documentation for:

### BLAS Level 1 (Vector Operations)
- `daxpy`, `saxpy` - Vector addition (y := alpha*x + y)
- `ddot`, `sdot` - Dot product
- `dscal`, `sscal` - Scale a vector
- `dnrm2`, `snrm2` - Euclidean norm
- `dcopy`, `scopy` - Copy a vector

### BLAS Level 2 (Matrix-Vector Operations)
- `dgemv`, `sgemv` - Matrix-vector multiplication
- `dger`, `sger` - Rank-1 update

### BLAS Level 3 (Matrix-Matrix Operations)
- `dgemm`, `sgemm` - Matrix-matrix multiplication
- `dtrsm`, `strsm` - Triangular solve

### LAPACK Linear Systems
- `dgesv`, `sgesv` - Solve Ax = b using LU factorization
- `dgetrf`, `sgetrf` - LU factorization

### LAPACK Least Squares and QR
- `dgeqrf`, `sgeqrf` - QR factorization

### LAPACK Symmetric/Hermitian
- `dpotrf`, `spotrf` - Cholesky factorization
- `dsyev`, `ssyev` - Eigenvalue decomposition

### LAPACK SVD
- `dgesvd`, `sgesvd` - Singular value decomposition

## Architecture

This extension is designed to work completely offline:

1. **Inventory** (`assets/docs/inventory.json`): Contains metadata for all routines including names, descriptions, categories, and official URLs
2. **Documentation Files** (`assets/docs/*.md`): Markdown files containing the full documentation for each routine
3. **Local Loading**: All files are bundled with the extension and loaded from the local filesystem

No network requests are made during normal operation, making the search instant and reliable.

## Adding New Documentation

To add documentation for additional LAPACK/BLAS routines:

1. Add an entry to `assets/docs/inventory.json`:
```json
{
  "id": "routine-name",
  "name": "routine-name",
  "role": "blas:routine" or "lapack:driver",
  "category": "BLAS Level 1" or "LAPACK Linear Equations",
  "url": "https://netlib.org/lapack/...",
  "docPath": "routine-name.md",
  "description": "Brief description of the routine"
}
```

2. Create a markdown file at `assets/docs/routine-name.md` with the documentation

3. Rebuild the extension: `npm run build`

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the extension
npm run build

# Lint and format code
npm run fix-lint
```

## Credits

Based on the NumPy Documentation Search extension pattern.

Official LAPACK/BLAS documentation is provided by [Netlib](https://netlib.org/lapack/).
