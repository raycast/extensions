```fortran
subroutine cgeru (
        integer m,
        integer n,
        complex alpha,
        complex, dimension(*) x,
        integer incx,
        complex, dimension(*) y,
        integer incy,
        complex, dimension(lda,*) a,
        integer lda
)
```

CGERU  performs the rank 1 operation

A := alpha\*x\*y\*\*T + A,

where alpha is a scalar, x is an m element vector, y is an n element
vector and A is an m by n matrix.

## Parameters
M : INTEGER [in]
> On entry, M specifies the number of rows of the matrix A.
> M must be at least zero.

N : INTEGER [in]
> On entry, N specifies the number of columns of the matrix A.
> N must be at least zero.

ALPHA : COMPLEX [in]
> On entry, ALPHA specifies the scalar alpha.

X : COMPLEX array, dimension at least [in]
> ( 1 + ( m - 1 )\*abs( INCX ) ).
> Before entry, the incremented array X must contain the m
> element vector x.

INCX : INTEGER [in]
> On entry, INCX specifies the increment for the elements of
> X. INCX must not be zero.

Y : COMPLEX array, dimension at least [in]
> ( 1 + ( n - 1 )\*abs( INCY ) ).
> Before entry, the incremented array Y must contain the n
> element vector y.

INCY : INTEGER [in]
> On entry, INCY specifies the increment for the elements of
> Y. INCY must not be zero.

A : COMPLEX array, dimension ( LDA, N ) [in,out]
> Before entry, the leading m by n part of the array A must
> contain the matrix of coefficients. On exit, A is
> overwritten by the updated matrix.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program. LDA must be at least
> max( 1, m ).
