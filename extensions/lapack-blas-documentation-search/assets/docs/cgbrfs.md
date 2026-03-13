```fortran
subroutine cgbrfs (
        character trans,
        integer n,
        integer kl,
        integer ku,
        integer nrhs,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        complex, dimension( ldafb, * ) afb,
        integer ldafb,
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

CGBRFS improves the computed solution to a system of linear
equations when the coefficient matrix is banded, and provides
error bounds and backward error estimates for the solution.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate transpose)

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KL : INTEGER [in]
> The number of subdiagonals within the band of A.  KL >= 0.

KU : INTEGER [in]
> The number of superdiagonals within the band of A.  KU >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices B and X.  NRHS >= 0.

AB : COMPLEX array, dimension (LDAB,N) [in]
> The original band matrix A, stored in rows 1 to KL+KU+1.
> The j-th column of A is stored in the j-th column of the
> array AB as follows:
> AB(ku+1+i-j,j) = A(i,j) for max(1,j-ku)<=i<=min(n,j+kl).

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KL+KU+1.

AFB : COMPLEX array, dimension (LDAFB,N) [in]
> Details of the LU factorization of the band matrix A, as
> computed by CGBTRF.  U is stored as an upper triangular band
> matrix with KL+KU superdiagonals in rows 1 to KL+KU+1, and
> the multipliers used during the factorization are stored in
> rows KL+KU+2 to 2\*KL+KU+1.

LDAFB : INTEGER [in]
> The leading dimension of the array AFB.  LDAFB >= 2\*KL\*KU+1.

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices from CGBTRF; for 1<=i<=N, row i of the
> matrix was interchanged with row IPIV(i).

B : COMPLEX array, dimension (LDB,NRHS) [in]
> The right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : COMPLEX array, dimension (LDX,NRHS) [in,out]
> On entry, the solution matrix X, as computed by CGBTRS.
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
