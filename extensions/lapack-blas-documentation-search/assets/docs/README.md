# LAPACK/BLAS Routine Index  
  
This directory contains markdown documentation for 2,178 LAPACK and BLAS routines.  
  
## Coverage  
  
- **LAPACK routines**: 2,018 routines  
- **BLAS routines**: 160 routines (Level 1, 2, and 3)  
  
## Naming Convention  
  
LAPACK and BLAS routines follow a naming convention where:  
- First letter indicates the data type:  
- `S` - Single precision real  
- `D` - Double precision real  
- `C` - Single precision complex  
- `Z` - Double precision complex  
  
- Remaining letters indicate the operation type and matrix type  
  
## Examples  
  
### BLAS Examples  
- `daxpy.md` - Double precision vector addition (Y = alpha*X + Y)  
- `dgemm.md` - Double precision general matrix multiplication  
- `ddot.md` - Double precision dot product  
  
### LAPACK Examples  
- `dgesv.md` - Solve system of linear equations AX=B (general matrix)  
- `dgesvd.md` - Compute singular value decomposition  
- `dsyev.md` - Compute eigenvalues/eigenvectors (symmetric matrix)  
- `dgetrf.md` - LU factorization (general matrix)  
  
## File Format  
  
Each markdown file contains:  
1. Function signature (Fortran syntax with types) - each parameter on its own line  
2. Detailed description of what the routine does  
3. Complete parameter documentation with types and descriptions  
  
## Source  
  
Generated from the official [LAPACK Reference Implementation](https://github.com/Reference-LAPACK/lapack) using Doxygen-formatted comments in the Fortran source files.  
