```fortran
subroutine sptrfs (
        integer n,
        integer nrhs,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( * ) df,
        real, dimension( * ) ef,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( ldx, * ) x,
        integer ldx,
        real, dimension( * ) ferr,
        real, dimension( * ) berr,
        real, dimension( * ) work,
        integer info
)
```

SPTRFS improves the computed solution to a system of linear
equations when the coefficient matrix is symmetric positive definite
and tridiagonal, and provides error bounds and backward error
estimates for the solution.

## Parameters
N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

D : REAL array, dimension (N) [in]
> The n diagonal elements of the tridiagonal matrix A.

E : REAL array, dimension (N-1) [in]
> The (n-1) subdiagonal elements of the tridiagonal matrix A.

DF : REAL array, dimension (N) [in]
> The n diagonal elements of the diagonal matrix D from the
> factorization computed by SPTTRF.

EF : REAL array, dimension (N-1) [in]
> The (n-1) subdiagonal elements of the unit bidiagonal factor
> L from the factorization computed by SPTTRF.

B : REAL array, dimension (LDB,NRHS) [in]
> The right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : REAL array, dimension (LDX,NRHS) [in,out]
> On entry, the solution matrix X, as computed by SPTTRS.
> On exit, the improved solution matrix X.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

FERR : REAL array, dimension (NRHS) [out]
> The forward error bound for each solution vector
> X(j) (the j-th column of the solution matrix X).
> If XTRUE is the true solution corresponding to X(j), FERR(j)
> is an estimated upper bound for the magnitude of the largest
> element in (X(j) - XTRUE) divided by the magnitude of the
> largest element in X(j).

BERR : REAL array, dimension (NRHS) [out]
> The componentwise relative backward error of each solution
> vector X(j) (i.e., the smallest relative change in
> any element of A or B that makes X(j) an exact solution).

WORK : REAL array, dimension (2\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
