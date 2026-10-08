```fortran
subroutine stptrs (
        character uplo,
        character trans,
        character diag,
        integer n,
        integer nrhs,
        real, dimension( * ) ap,
        real, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

STPTRS solves a triangular system of the form

A \* X = B  or  A\*\*T \* X = B,

where A is a triangular matrix of order N stored in packed format, and B is an N-by-NRHS matrix.

This subroutine verifies that A is nonsingular, but callers should note that only exact
singularity is detected. It is conceivable for one or more diagonal elements of A to be
subnormally tiny numbers without this subroutine signalling an error.

If a possible loss of numerical precision due to near-singular matrices is a concern, the
caller should verify that A is nonsingular within some tolerance before calling this subroutine.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B  (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate transpose = Transpose)

DIAG : CHARACTER\*1 [in]
> = 'N':  A is non-unit triangular;
> = 'U':  A is unit triangular.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

AP : REAL array, dimension (N\*(N+1)/2) [in]
> The upper or lower triangular matrix A, packed columnwise in
> a linear array.  The j-th column of A is stored in the array
> AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2\*n-j)/2) = A(i,j) for j<=i<=n.

B : REAL array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, if INFO = 0, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the i-th diagonal element of A is exactly zero,
> indicating that the matrix is singular and the
> solutions X have not been computed.
