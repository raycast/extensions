```fortran
subroutine zgtrfs (
        character trans,
        integer n,
        integer nrhs,
        complex*16, dimension( * ) dl,
        complex*16, dimension( * ) d,
        complex*16, dimension( * ) du,
        complex*16, dimension( * ) dlf,
        complex*16, dimension( * ) df,
        complex*16, dimension( * ) duf,
        complex*16, dimension( * ) du2,
        integer, dimension( * ) ipiv,
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

ZGTRFS improves the computed solution to a system of linear
equations when the coefficient matrix is tridiagonal, and provides
error bounds and backward error estimates for the solution.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate transpose)

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

DL : COMPLEX\*16 array, dimension (N-1) [in]
> The (n-1) subdiagonal elements of A.

D : COMPLEX\*16 array, dimension (N) [in]
> The diagonal elements of A.

DU : COMPLEX\*16 array, dimension (N-1) [in]
> The (n-1) superdiagonal elements of A.

DLF : COMPLEX\*16 array, dimension (N-1) [in]
> The (n-1) multipliers that define the matrix L from the
> LU factorization of A as computed by ZGTTRF.

DF : COMPLEX\*16 array, dimension (N) [in]
> The n diagonal elements of the upper triangular matrix U from
> the LU factorization of A.

DUF : COMPLEX\*16 array, dimension (N-1) [in]
> The (n-1) elements of the first superdiagonal of U.

DU2 : COMPLEX\*16 array, dimension (N-2) [in]
> The (n-2) elements of the second superdiagonal of U.

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices; for 1 <= i <= n, row i of the matrix was
> interchanged with row IPIV(i).  IPIV(i) will always be either
> i or i+1; IPIV(i) = i indicates a row interchange was not
> required.

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in]
> The right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : COMPLEX\*16 array, dimension (LDX,NRHS) [in,out]
> On entry, the solution matrix X, as computed by ZGTTRS.
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
