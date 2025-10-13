```fortran
subroutine dgemv (
        character trans,
        integer m,
        integer n,
        double precision alpha,
        double precision, dimension(lda,*) a,
        integer lda,
        double precision, dimension(*) x,
        integer incx,
        double precision beta,
        double precision, dimension(*) y,
        integer incy
)
```

DGEMV  performs one of the matrix-vector operations

y := alpha\*A\*x + beta\*y,   or   y := alpha\*A\*\*T\*x + beta\*y,

where alpha and beta are scalars, x and y are vectors and A is an
m by n matrix.

## Parameters
TRANS : CHARACTER\*1 [in]
> On entry, TRANS specifies the operation to be performed as
> follows:
> 
> TRANS = 'N' or 'n'   y := alpha\*A\*x + beta\*y.
> 
> TRANS = 'T' or 't'   y := alpha\*A\*\*T\*x + beta\*y.
> 
> TRANS = 'C' or 'c'   y := alpha\*A\*\*T\*x + beta\*y.

M : INTEGER [in]
> On entry, M specifies the number of rows of the matrix A.
> M must be at least zero.

N : INTEGER [in]
> On entry, N specifies the number of columns of the matrix A.
> N must be at least zero.

ALPHA : DOUBLE PRECISION. [in]
> On entry, ALPHA specifies the scalar alpha.

A : DOUBLE PRECISION array, dimension ( LDA, N ) [in]
> Before entry, the leading m by n part of the array A must
> contain the matrix of coefficients.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program. LDA must be at least
> max( 1, m ).

X : DOUBLE PRECISION array, dimension at least [in]
> ( 1 + ( n - 1 )\*abs( INCX ) ) when TRANS = 'N' or 'n'
> and at least
> ( 1 + ( m - 1 )\*abs( INCX ) ) otherwise.
> Before entry, the incremented array X must contain the
> vector x.

INCX : INTEGER [in]
> On entry, INCX specifies the increment for the elements of
> X. INCX must not be zero.

BETA : DOUBLE PRECISION. [in]
> On entry, BETA specifies the scalar beta. When BETA is
> supplied as zero then Y need not be set on input.

Y : DOUBLE PRECISION array, dimension at least [in,out]
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
