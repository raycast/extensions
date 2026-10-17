```fortran
subroutine csyr (
        character uplo,
        integer n,
        complex alpha,
        complex, dimension( * ) x,
        integer incx,
        complex, dimension( lda, * ) a,
        integer lda
)
```

CSYR   performs the symmetric rank 1 operation

A := alpha\*x\*x\*\*H + A,

where alpha is a complex scalar, x is an n element vector and A is an
n by n symmetric matrix.

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
> 
> Unchanged on exit.

N : INTEGER [in]
> On entry, N specifies the order of the matrix A.
> N must be at least zero.
> Unchanged on exit.

ALPHA : COMPLEX [in]
> On entry, ALPHA specifies the scalar alpha.
> Unchanged on exit.

X : COMPLEX array, dimension at least [in]
> ( 1 + ( N - 1 )\*abs( INCX ) ).
> Before entry, the incremented array X must contain the N-
> element vector x.
> Unchanged on exit.

INCX : INTEGER [in]
> On entry, INCX specifies the increment for the elements of
> X. INCX must not be zero.
> Unchanged on exit.

A : COMPLEX array, dimension ( LDA, N ) [in,out]
> Before entry, with  UPLO = 'U' or 'u', the leading n by n
> upper triangular part of the array A must contain the upper
> triangular part of the symmetric matrix and the strictly
> lower triangular part of A is not referenced. On exit, the
> upper triangular part of the array A is overwritten by the
> upper triangular part of the updated matrix.
> Before entry, with UPLO = 'L' or 'l', the leading n by n
> lower triangular part of the array A must contain the lower
> triangular part of the symmetric matrix and the strictly
> upper triangular part of A is not referenced. On exit, the
> lower triangular part of the array A is overwritten by the
> lower triangular part of the updated matrix.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program. LDA must be at least
> max( 1, N ).
> Unchanged on exit.
