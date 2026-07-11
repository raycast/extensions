```fortran
subroutine dptrfs (
        integer n,
        integer nrhs,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        double precision, dimension( * ) df,
        double precision, dimension( * ) ef,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision, dimension( ldx, * ) x,
        integer ldx,
        double precision, dimension( * ) ferr,
        double precision, dimension( * ) berr,
        double precision, dimension( * ) work,
        integer info
)
```

DPTRFS improves the computed solution to a system of linear
equations when the coefficient matrix is symmetric positive definite
and tridiagonal, and provides error bounds and backward error
estimates for the solution.

## Parameters
N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

D : DOUBLE PRECISION array, dimension (N) [in]
> The n diagonal elements of the tridiagonal matrix A.

E : DOUBLE PRECISION array, dimension (N-1) [in]
> The (n-1) subdiagonal elements of the tridiagonal matrix A.

DF : DOUBLE PRECISION array, dimension (N) [in]
> The n diagonal elements of the diagonal matrix D from the
> factorization computed by DPTTRF.

EF : DOUBLE PRECISION array, dimension (N-1) [in]
> The (n-1) subdiagonal elements of the unit bidiagonal factor
> L from the factorization computed by DPTTRF.

B : DOUBLE PRECISION array, dimension (LDB,NRHS) [in]
> The right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : DOUBLE PRECISION array, dimension (LDX,NRHS) [in,out]
> On entry, the solution matrix X, as computed by DPTTRS.
> On exit, the improved solution matrix X.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

FERR : DOUBLE PRECISION array, dimension (NRHS) [out]
> The forward error bound for each solution vector
> X(j) (the j-th column of the solution matrix X).
> If XTRUE is the true solution corresponding to X(j), FERR(j)
> is an estimated upper bound for the magnitude of the largest
> element in (X(j) - XTRUE) divided by the magnitude of the
> largest element in X(j).

BERR : DOUBLE PRECISION array, dimension (NRHS) [out]
> The componentwise relative backward error of each solution
> vector X(j) (i.e., the smallest relative change in
> any element of A or B that makes X(j) an exact solution).

WORK : DOUBLE PRECISION array, dimension (2\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
