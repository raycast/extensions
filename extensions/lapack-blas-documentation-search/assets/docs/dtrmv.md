```fortran
subroutine dtrmv (
        character uplo,
        character trans,
        character diag,
        integer n,
        double precision, dimension(lda,*) a,
        integer lda,
        double precision, dimension(*) x,
        integer incx
)
```

DTRMV  performs one of the matrix-vector operations

x := A\*x,   or   x := A\*\*T\*x,

where x is an n element vector and  A is an n by n unit, or non-unit,
upper or lower triangular matrix.

## Parameters
UPLO : CHARACTER\*1 [in]
> On entry, UPLO specifies whether the matrix is an upper or
> lower triangular matrix as follows:
> 
> UPLO = 'U' or 'u'   A is an upper triangular matrix.
> 
> UPLO = 'L' or 'l'   A is a lower triangular matrix.

TRANS : CHARACTER\*1 [in]
> On entry, TRANS specifies the operation to be performed as
> follows:
> 
> TRANS = 'N' or 'n'   x := A\*x.
> 
> TRANS = 'T' or 't'   x := A\*\*T\*x.
> 
> TRANS = 'C' or 'c'   x := A\*\*T\*x.

DIAG : CHARACTER\*1 [in]
> On entry, DIAG specifies whether or not A is unit
> triangular as follows:
> 
> DIAG = 'U' or 'u'   A is assumed to be unit triangular.
> 
> DIAG = 'N' or 'n'   A is not assumed to be unit
> triangular.

N : INTEGER [in]
> On entry, N specifies the order of the matrix A.
> N must be at least zero.

A : DOUBLE PRECISION array, dimension ( LDA, N ) [in]
> Before entry with  UPLO = 'U' or 'u', the leading n by n
> upper triangular part of the array A must contain the upper
> triangular matrix and the strictly lower triangular part of
> A is not referenced.
> Before entry with UPLO = 'L' or 'l', the leading n by n
> lower triangular part of the array A must contain the lower
> triangular matrix and the strictly upper triangular part of
> A is not referenced.
> Note that when  DIAG = 'U' or 'u', the diagonal elements of
> A are not referenced either, but are assumed to be unity.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program. LDA must be at least
> max( 1, n ).

X : DOUBLE PRECISION array, dimension at least [in,out]
> ( 1 + ( n - 1 )\*abs( INCX ) ).
> Before entry, the incremented array X must contain the n
> element vector x. On exit, X is overwritten with the
> transformed vector x.

INCX : INTEGER [in]
> On entry, INCX specifies the increment for the elements of
> X. INCX must not be zero.
