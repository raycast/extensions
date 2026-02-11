```fortran
subroutine ztbrfs (
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
        complex*16, dimension( ldx, * ) x,
        integer ldx,
        double precision, dimension( * ) ferr,
        double precision, dimension( * ) berr,
        complex*16, dimension( * ) work,
        double precision, dimension( * ) rwork,
        integer info
)
```

ZTBRFS provides error bounds and backward error estimates for the
solution to a system of linear equations with a triangular band
coefficient matrix.

The solution matrix X must be computed by ZTBTRS or some other
means before entering this routine.  ZTBRFS does not do iterative
refinement because doing so cannot improve the backward error.

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
> of the matrices B and X.  NRHS >= 0.

AB : COMPLEX\*16 array, dimension (LDAB,N) [in]
> The upper or lower triangular band matrix A, stored in the
> first kd+1 rows of the array. The j-th column of A is stored
> in the j-th column of the array AB as follows:
> if UPLO = 'U', AB(kd+1+i-j,j) = A(i,j) for max(1,j-kd)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(n,j+kd).
> If DIAG = 'U', the diagonal elements of A are not referenced
> and are assumed to be 1.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD+1.

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in]
> The right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : COMPLEX\*16 array, dimension (LDX,NRHS) [in]
> The solution matrix X.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

FERR : DOUBLE PRECISION array, dimension (NRHS) [out]
> The estimated forward error bound for each solution vector
> X(j) (the j-th column of the solution matrix X).
> If XTRUE is the true solution corresponding to X(j), FERR(j)
> is an estimated upper bound for the magnitude of the largest
> element in (X(j) - XTRUE) divided by the magnitude of the
> largest element in X(j).  The estimate is as reliable as
> the estimate for RCOND, and is almost always a slight
> overestimate of the true error.

BERR : DOUBLE PRECISION array, dimension (NRHS) [out]
> The componentwise relative backward error of each solution
> vector X(j) (i.e., the smallest relative change in
> any element of A or B that makes X(j) an exact solution).

WORK : COMPLEX\*16 array, dimension (2\*N) [out]

RWORK : DOUBLE PRECISION array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
