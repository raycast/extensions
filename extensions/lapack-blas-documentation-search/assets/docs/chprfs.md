```fortran
subroutine chprfs (
        character uplo,
        integer n,
        integer nrhs,
        complex, dimension( * ) ap,
        complex, dimension( * ) afp,
        integer, dimension( * ) ipiv,
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

CHPRFS improves the computed solution to a system of linear
equations when the coefficient matrix is Hermitian indefinite
and packed, and provides error bounds and backward error estimates
for the solution.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices B and X.  NRHS >= 0.

AP : COMPLEX array, dimension (N\*(N+1)/2) [in]
> The upper or lower triangle of the Hermitian matrix A, packed
> columnwise in a linear array.  The j-th column of A is stored
> in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2\*n-j)/2) = A(i,j) for j<=i<=n.

AFP : COMPLEX array, dimension (N\*(N+1)/2) [in]
> The factored form of the matrix A.  AFP contains the block
> diagonal matrix D and the multipliers used to obtain the
> factor U or L from the factorization A = U\*D\*U\*\*H or
> A = L\*D\*L\*\*H as computed by CHPTRF, stored as a packed
> triangular matrix.

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by CHPTRF.

B : COMPLEX array, dimension (LDB,NRHS) [in]
> The right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : COMPLEX array, dimension (LDX,NRHS) [in,out]
> On entry, the solution matrix X, as computed by CHPTRS.
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
