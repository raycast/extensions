```fortran
subroutine dsyr2 (
        character uplo,
        integer n,
        double precision alpha,
        double precision, dimension(*) x,
        integer incx,
        double precision, dimension(*) y,
        integer incy,
        double precision, dimension(lda,*) a,
        integer lda
)
```

DSYR2  performs the symmetric rank 2 operation

A := alpha\*x\*y\*\*T + alpha\*y\*x\*\*T + A,

where alpha is a scalar, x and y are n element vectors and A is an n
by n symmetric matrix.

## Parameters
UPLO : CHARACTER\*1 [in]
> On entry, UPLO specifies whether the upper or lower
> triangular part of the array A is to be referenced as
> follows:
> 
> UPLO = 'U' or 'u'   Only the upper triangular part of A
> is to be referenced.
> 
> UPLO = 'L' or 'l'   Only the lower triangular part of A
> is to be referenced.

N : INTEGER [in]
> On entry, N specifies the order of the matrix A.
> N must be at least zero.

ALPHA : DOUBLE PRECISION. [in]
> On entry, ALPHA specifies the scalar alpha.

X : DOUBLE PRECISION array, dimension at least [in]
> ( 1 + ( n - 1 )\*abs( INCX ) ).
> Before entry, the incremented array X must contain the n
> element vector x.

INCX : INTEGER [in]
> On entry, INCX specifies the increment for the elements of
> X. INCX must not be zero.

Y : DOUBLE PRECISION array, dimension at least [in]
> ( 1 + ( n - 1 )\*abs( INCY ) ).
> Before entry, the incremented array Y must contain the n
> element vector y.

INCY : INTEGER [in]
> On entry, INCY specifies the increment for the elements of
> Y. INCY must not be zero.

A : DOUBLE PRECISION array, dimension ( LDA, N ) [in,out]
> Before entry with  UPLO = 'U' or 'u', the leading n by n
> upper triangular part of the array A must contain the upper
> triangular part of the symmetric matrix and the strictly
> lower triangular part of A is not referenced. On exit, the
> upper triangular part of the array A is overwritten by the
> upper triangular part of the updated matrix.
> Before entry with UPLO = 'L' or 'l', the leading n by n
> lower triangular part of the array A must contain the lower
> triangular part of the symmetric matrix and the strictly
> upper triangular part of A is not referenced. On exit, the
> lower triangular part of the array A is overwritten by the
> lower triangular part of the updated matrix.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program. LDA must be at least
> max( 1, n ).
