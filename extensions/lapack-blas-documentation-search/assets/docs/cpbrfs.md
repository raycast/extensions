```fortran
subroutine cpbrfs (
        character uplo,
        integer n,
        integer kd,
        integer nrhs,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        complex, dimension( ldafb, * ) afb,
        integer ldafb,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( ldx, * ) x,
        integer ldx,
        real, dimension( * ) ferr,
        real, dimension( * ) berr,
        complex, dimension( * ) work,
        real, dimension( * ) rwork,
        integer info
)
```

CPBRFS improves the computed solution to a system of linear
equations when the coefficient matrix is Hermitian positive definite
and banded, and provides error bounds and backward error estimates
for the solution.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KD : INTEGER [in]
> The number of superdiagonals of the matrix A if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'.  KD >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices B and X.  NRHS >= 0.

AB : COMPLEX array, dimension (LDAB,N) [in]
> The upper or lower triangle of the Hermitian band matrix A,
> stored in the first KD+1 rows of the array.  The j-th column
> of A is stored in the j-th column of the array AB as follows:
> if UPLO = 'U', AB(kd+1+i-j,j) = A(i,j) for max(1,j-kd)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(n,j+kd).

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD+1.

AFB : COMPLEX array, dimension (LDAFB,N) [in]
> The triangular factor U or L from the Cholesky factorization
> A = U\*\*H\*U or A = L\*L\*\*H of the band matrix A as computed by
> CPBTRF, in the same storage format as A (see AB).

LDAFB : INTEGER [in]
> The leading dimension of the array AFB.  LDAFB >= KD+1.

B : COMPLEX array, dimension (LDB,NRHS) [in]
> The right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : COMPLEX array, dimension (LDX,NRHS) [in,out]
> On entry, the solution matrix X, as computed by CPBTRS.
> On exit, the improved solution matrix X.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

FERR : REAL array, dimension (NRHS) [out]
> The estimated forward error bound for each solution vector
> X(j) (the j-th column of the solution matrix X).
> If XTRUE is the true solution corresponding to X(j), FERR(j)
> is an estimated upper bound for the magnitude of the largest
> element in (X(j) - XTRUE) divided by the magnitude of the
> largest element in X(j).  The estimate is as reliable as
> the estimate for RCOND, and is almost always a slight
> overestimate of the true error.

BERR : REAL array, dimension (NRHS) [out]
> The componentwise relative backward error of each solution
> vector X(j) (i.e., the smallest relative change in
> any element of A or B that makes X(j) an exact solution).

WORK : COMPLEX array, dimension (2\*N) [out]

RWORK : REAL array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
