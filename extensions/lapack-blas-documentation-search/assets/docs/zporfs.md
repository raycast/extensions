```fortran
subroutine zporfs (
        character uplo,
        integer n,
        integer nrhs,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldaf, * ) af,
        integer ldaf,
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

ZPORFS improves the computed solution to a system of linear
equations when the coefficient matrix is Hermitian positive definite,
and provides error bounds and backward error estimates for the
solution.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices B and X.  NRHS >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in]
> The Hermitian matrix A.  If UPLO = 'U', the leading N-by-N
> upper triangular part of A contains the upper triangular part
> of the matrix A, and the strictly lower triangular part of A
> is not referenced.  If UPLO = 'L', the leading N-by-N lower
> triangular part of A contains the lower triangular part of
> the matrix A, and the strictly upper triangular part of A is
> not referenced.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : COMPLEX\*16 array, dimension (LDAF,N) [in]
> The triangular factor U or L from the Cholesky factorization
> A = U\*\*H\*U or A = L\*L\*\*H, as computed by ZPOTRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in]
> The right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : COMPLEX\*16 array, dimension (LDX,NRHS) [in,out]
> On entry, the solution matrix X, as computed by ZPOTRS.
> On exit, the improved solution matrix X.

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
