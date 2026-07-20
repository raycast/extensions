```fortran
subroutine zptts2 (
        integer iuplo,
        integer n,
        integer nrhs,
        double precision, dimension( * ) d,
        complex*16, dimension( * ) e,
        complex*16, dimension( ldb, * ) b,
        integer ldb
)
```

ZPTTS2 solves a tridiagonal system of the form
A \* X = B
using the factorization A = U\*\*H \*D\*U or A = L\*D\*L\*\*H computed by ZPTTRF.
D is a diagonal matrix specified in the vector D, U (or L) is a unit
bidiagonal matrix whose superdiagonal (subdiagonal) is specified in
the vector E, and X and B are N by NRHS matrices.

## Parameters
IUPLO : INTEGER [in]
> Specifies the form of the factorization and whether the
> vector E is the superdiagonal of the upper bidiagonal factor
> U or the subdiagonal of the lower bidiagonal factor L.
> = 1:  A = U\*\*H \*D\*U, E is the superdiagonal of U
> = 0:  A = L\*D\*L\*\*H, E is the subdiagonal of L

N : INTEGER [in]
> The order of the tridiagonal matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

D : DOUBLE PRECISION array, dimension (N) [in]
> The n diagonal elements of the diagonal matrix D from the
> factorization A = U\*\*H \*D\*U or A = L\*D\*L\*\*H.

E : COMPLEX\*16 array, dimension (N-1) [in]
> If IUPLO = 1, the (n-1) superdiagonal elements of the unit
> bidiagonal factor U from the factorization A = U\*\*H\*D\*U.
> If IUPLO = 0, the (n-1) subdiagonal elements of the unit
> bidiagonal factor L from the factorization A = L\*D\*L\*\*H.

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side vectors B for the system of
> linear equations.
> On exit, the solution vectors, X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).
