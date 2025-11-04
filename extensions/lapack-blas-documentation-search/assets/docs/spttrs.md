```fortran
subroutine spttrs (
        integer n,
        integer nrhs,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

SPTTRS solves a tridiagonal system of the form
A \* X = B
using the L\*D\*L\*\*T factorization of A computed by SPTTRF.  D is a
diagonal matrix specified in the vector D, L is a unit bidiagonal
matrix whose subdiagonal is specified in the vector E, and X and B
are N by NRHS matrices.

## Parameters
N : INTEGER [in]
> The order of the tridiagonal matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

D : REAL array, dimension (N) [in]
> The n diagonal elements of the diagonal matrix D from the
> L\*D\*L\*\*T factorization of A.

E : REAL array, dimension (N-1) [in]
> The (n-1) subdiagonal elements of the unit bidiagonal factor
> L from the L\*D\*L\*\*T factorization of A.  E can also be regarded
> as the superdiagonal of the unit bidiagonal factor U from the
> factorization A = U\*\*T\*D\*U.

B : REAL array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side vectors B for the system of
> linear equations.
> On exit, the solution vectors, X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -k, the k-th argument had an illegal value
