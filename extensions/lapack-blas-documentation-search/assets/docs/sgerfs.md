```fortran
subroutine sgerfs (
        character trans,
        integer n,
        integer nrhs,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldaf, * ) af,
        integer ldaf,
        integer, dimension( * ) ipiv,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( ldx, * ) x,
        integer ldx,
        real, dimension( * ) ferr,
        real, dimension( * ) berr,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

SGERFS improves the computed solution to a system of linear
equations and provides error bounds and backward error estimates for
the solution.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate transpose = Transpose)

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices B and X.  NRHS >= 0.

A : REAL array, dimension (LDA,N) [in]
> The original N-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : REAL array, dimension (LDAF,N) [in]
> The factors L and U from the factorization A = P\*L\*U
> as computed by SGETRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices from SGETRF; for 1<=i<=N, row i of the
> matrix was interchanged with row IPIV(i).

B : REAL array, dimension (LDB,NRHS) [in]
> The right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : REAL array, dimension (LDX,NRHS) [in,out]
> On entry, the solution matrix X, as computed by SGETRS.
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

WORK : REAL array, dimension (3\*N) [out]

IWORK : INTEGER array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
