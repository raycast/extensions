```fortran
subroutine dlagtm (
        character trans,
        integer n,
        integer nrhs,
        double precision alpha,
        double precision, dimension( * ) dl,
        double precision, dimension( * ) d,
        double precision, dimension( * ) du,
        double precision, dimension( ldx, * ) x,
        integer ldx,
        double precision beta,
        double precision, dimension( ldb, * ) b,
        integer ldb
)
```

DLAGTM performs a matrix-matrix product of the form

B := alpha \* A \* X + beta \* B

where A is a tridiagonal matrix of order N, B and X are N by NRHS
matrices, and alpha and beta are real scalars, each of which may be
0., 1., or -1.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the operation applied to A.
> = 'N':  No transpose, B := alpha \* A \* X + beta \* B
> = 'T':  Transpose,    B := alpha \* A'\* X + beta \* B
> = 'C':  Conjugate transpose = Transpose

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices X and B.

ALPHA : DOUBLE PRECISION [in]
> The scalar alpha.  ALPHA must be 0., 1., or -1.; otherwise,
> it is assumed to be 0.

DL : DOUBLE PRECISION array, dimension (N-1) [in]
> The (n-1) sub-diagonal elements of T.

D : DOUBLE PRECISION array, dimension (N) [in]
> The diagonal elements of T.

DU : DOUBLE PRECISION array, dimension (N-1) [in]
> The (n-1) super-diagonal elements of T.

X : DOUBLE PRECISION array, dimension (LDX,NRHS) [in]
> The N by NRHS matrix X.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(N,1).

BETA : DOUBLE PRECISION [in]
> The scalar beta.  BETA must be 0., 1., or -1.; otherwise,
> it is assumed to be 1.

B : DOUBLE PRECISION array, dimension (LDB,NRHS) [in,out]
> On entry, the N by NRHS matrix B.
> On exit, B is overwritten by the matrix expression
> B := alpha \* A \* X + beta \* B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(N,1).
