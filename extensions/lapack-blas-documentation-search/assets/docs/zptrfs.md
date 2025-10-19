```fortran
subroutine zptrfs (
        character uplo,
        integer n,
        integer nrhs,
        double precision, dimension( * ) d,
        complex*16, dimension( * ) e,
        double precision, dimension( * ) df,
        complex*16, dimension( * ) ef,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        complex*16, dimension( ldx, * ) x,
        integer ldx,
        double precision, dimension( * ) ferr,
        double precision, dimension( * ) berr,
        complex*16, dimension( * ) work,
        double precision, dimension( * ) rwork,
        integer info
)
```

ZPTRFS improves the computed solution to a system of linear
equations when the coefficient matrix is Hermitian positive definite
and tridiagonal, and provides error bounds and backward error
estimates for the solution.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the superdiagonal or the subdiagonal of the
> tridiagonal matrix A is stored and the form of the
> factorization:
> = 'U':  E is the superdiagonal of A, and A = U\*\*H\*D\*U;
> = 'L':  E is the subdiagonal of A, and A = L\*D\*L\*\*H.
> (The two forms are equivalent if A is real.)

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

D : DOUBLE PRECISION array, dimension (N) [in]
> The n real diagonal elements of the tridiagonal matrix A.

E : COMPLEX\*16 array, dimension (N-1) [in]
> The (n-1) off-diagonal elements of the tridiagonal matrix A
> (see UPLO).

DF : DOUBLE PRECISION array, dimension (N) [in]
> The n diagonal elements of the diagonal matrix D from
> the factorization computed by ZPTTRF.

EF : COMPLEX\*16 array, dimension (N-1) [in]
> The (n-1) off-diagonal elements of the unit bidiagonal
> factor U or L from the factorization computed by ZPTTRF
> (see UPLO).

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in]
> The right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : COMPLEX\*16 array, dimension (LDX,NRHS) [in,out]
> On entry, the solution matrix X, as computed by ZPTTRS.
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

WORK : COMPLEX\*16 array, dimension (N) [out]

RWORK : DOUBLE PRECISION array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
