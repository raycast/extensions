```fortran
subroutine ztbtrs (
        character uplo,
        character trans,
        character diag,
        integer n,
        integer kd,
        integer nrhs,
        complex*16, dimension( ldab, * ) ab,
        integer ldab,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

ZTBTRS solves a triangular system of the form

A \* X = B,  A\*\*T \* X = B,  or  A\*\*H \* X = B,

where A is a triangular band matrix of order N, and B is an N-by-NRHS matrix.

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
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate transpose)

DIAG : CHARACTER\*1 [in]
> = 'N':  A is non-unit triangular;
> = 'U':  A is unit triangular.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KD : INTEGER [in]
> The number of superdiagonals or subdiagonals of the
> triangular band matrix A.  KD >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

AB : COMPLEX\*16 array, dimension (LDAB,N) [in]
> The upper or lower triangular band matrix A, stored in the
> first kd+1 rows of AB.  The j-th column of A is stored
> in the j-th column of the array AB as follows:
> if UPLO = 'U', AB(kd+1+i-j,j) = A(i,j) for max(1,j-kd)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(n,j+kd).
> If DIAG = 'U', the diagonal elements of A are not referenced
> and are assumed to be 1.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD+1.

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in,out]
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
