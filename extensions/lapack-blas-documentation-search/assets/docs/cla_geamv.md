```fortran
subroutine cla_geamv (
        integer trans,
        integer m,
        integer n,
        real alpha,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( * ) x,
        integer incx,
        real beta,
        real, dimension( * ) y,
        integer incy
)
```

CLA_GEAMV  performs one of the matrix-vector operations

y := alpha\*abs(A)\*abs(x) + beta\*abs(y),
or   y := alpha\*abs(A)\*\*T\*abs(x) + beta\*abs(y),

where alpha and beta are scalars, x and y are vectors and A is an
m by n matrix.

This function is primarily used in calculating error bounds.
To protect against underflow during evaluation, components in
the resulting vector are perturbed away from zero by (N+1)
times the underflow threshold.  To prevent unnecessarily large
errors for block-structure embedded in general matrices,
zero components are not perturbed.  A zero
entry is considered  if all multiplications involved
in computing that entry have at least one zero multiplicand.

## Parameters
TRANS : INTEGER [in]
> On entry, TRANS specifies the operation to be performed as
> follows:
> 
> BLAS_NO_TRANS      y := alpha\*abs(A)\*abs(x) + beta\*abs(y)
> BLAS_TRANS         y := alpha\*abs(A\*\*T)\*abs(x) + beta\*abs(y)
> BLAS_CONJ_TRANS    y := alpha\*abs(A\*\*T)\*abs(x) + beta\*abs(y)
> 
> Unchanged on exit.

M : INTEGER [in]
> On entry, M specifies the number of rows of the matrix A.
> M must be at least zero.
> Unchanged on exit.

N : INTEGER [in]
> On entry, N specifies the number of columns of the matrix A.
> N must be at least zero.
> Unchanged on exit.

ALPHA : REAL [in]
> On entry, ALPHA specifies the scalar alpha.
> Unchanged on exit.

A : COMPLEX array, dimension (LDA,n) [in]
> Before entry, the leading m by n part of the array A must
> contain the matrix of coefficients.
> Unchanged on exit.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program. LDA must be at least
> max( 1, m ).
> Unchanged on exit.

X : COMPLEX array, dimension [in]
> ( 1 + ( n - 1 )\*abs( INCX ) ) when TRANS = 'N' or 'n'
> and at least
> ( 1 + ( m - 1 )\*abs( INCX ) ) otherwise.
> Before entry, the incremented array X must contain the
> vector x.
> Unchanged on exit.

INCX : INTEGER [in]
> On entry, INCX specifies the increment for the elements of
> X. INCX must not be zero.
> Unchanged on exit.

BETA : REAL [in]
> On entry, BETA specifies the scalar beta. When BETA is
> supplied as zero then Y need not be set on input.
> Unchanged on exit.

Y : REAL array, dimension [in,out]
> ( 1 + ( m - 1 )\*abs( INCY ) ) when TRANS = 'N' or 'n'
> and at least
> ( 1 + ( n - 1 )\*abs( INCY ) ) otherwise.
> Before entry with BETA non-zero, the incremented array Y
> must contain the vector y. On exit, Y is overwritten by the
> updated vector y.
> If either m or n is zero, then Y not referenced and the function
> performs a quick return.

INCY : INTEGER [in]
> On entry, INCY specifies the increment for the elements of
> Y. INCY must not be zero.
> Unchanged on exit.
> 
> Level 2 Blas routine.
