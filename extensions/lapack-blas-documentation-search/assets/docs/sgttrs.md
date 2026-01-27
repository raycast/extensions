```fortran
subroutine sgttrs (
        character trans,
        integer n,
        integer nrhs,
        real, dimension( * ) dl,
        real, dimension( * ) d,
        real, dimension( * ) du,
        real, dimension( * ) du2,
        integer, dimension( * ) ipiv,
        real, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

SGTTRS solves one of the systems of equations
A\*X = B  or  A\*\*T\*X = B,
with a tridiagonal matrix A using the LU factorization computed
by SGTTRF.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations.
> = 'N':  A \* X = B  (No transpose)
> = 'T':  A\*\*T\* X = B  (Transpose)
> = 'C':  A\*\*T\* X = B  (Conjugate transpose = Transpose)

N : INTEGER [in]
> The order of the matrix A.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

DL : REAL array, dimension (N-1) [in]
> The (n-1) multipliers that define the matrix L from the
> LU factorization of A.

D : REAL array, dimension (N) [in]
> The n diagonal elements of the upper triangular matrix U from
> the LU factorization of A.

DU : REAL array, dimension (N-1) [in]
> The (n-1) elements of the first super-diagonal of U.

DU2 : REAL array, dimension (N-2) [in]
> The (n-2) elements of the second super-diagonal of U.

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices; for 1 <= i <= n, row i of the matrix was
> interchanged with row IPIV(i).  IPIV(i) will always be either
> i or i+1; IPIV(i) = i indicates a row interchange was not
> required.

B : REAL array, dimension (LDB,NRHS) [in,out]
> On entry, the matrix of right hand side vectors B.
> On exit, B is overwritten by the solution vectors X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
