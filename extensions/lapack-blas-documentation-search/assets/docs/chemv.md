```fortran
subroutine chemv (
        character uplo,
        integer n,
        complex alpha,
        complex, dimension(lda,*) a,
        integer lda,
        complex, dimension(*) x,
        integer incx,
        complex beta,
        complex, dimension(*) y,
        integer incy
)
```

CHEMV  performs the matrix-vector  operation

y := alpha\*A\*x + beta\*y,

where alpha and beta are scalars, x and y are n element vectors and
A is an n by n hermitian matrix.

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

ALPHA : COMPLEX [in]
> On entry, ALPHA specifies the scalar alpha.

A : COMPLEX array, dimension ( LDA, N ) [in]
> Before entry with  UPLO = 'U' or 'u', the leading n by n
> upper triangular part of the array A must contain the upper
> triangular part of the hermitian matrix and the strictly
> lower triangular part of A is not referenced.
> Before entry with UPLO = 'L' or 'l', the leading n by n
> lower triangular part of the array A must contain the lower
> triangular part of the hermitian matrix and the strictly
> upper triangular part of A is not referenced.
> Note that the imaginary parts of the diagonal elements need
> not be set and are assumed to be zero.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program. LDA must be at least
> max( 1, n ).

X : COMPLEX array, dimension at least [in]
> ( 1 + ( n - 1 )\*abs( INCX ) ).
> Before entry, the incremented array X must contain the n
> element vector x.

INCX : INTEGER [in]
> On entry, INCX specifies the increment for the elements of
> X. INCX must not be zero.

BETA : COMPLEX [in]
> On entry, BETA specifies the scalar beta. When BETA is
> supplied as zero then Y need not be set on input.

Y : COMPLEX array, dimension at least [in,out]
> ( 1 + ( n - 1 )\*abs( INCY ) ).
> Before entry, the incremented array Y must contain the n
> element vector y. On exit, Y is overwritten by the updated
> vector y.

INCY : INTEGER [in]
> On entry, INCY specifies the increment for the elements of
> Y. INCY must not be zero.
