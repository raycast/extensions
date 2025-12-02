```fortran
subroutine ztbmv (
        character uplo,
        character trans,
        character diag,
        integer n,
        integer k,
        complex*16, dimension(lda,*) a,
        integer lda,
        complex*16, dimension(*) x,
        integer incx
)
```

ZTBMV  performs one of the matrix-vector operations

x := A\*x,   or   x := A\*\*T\*x,   or   x := A\*\*H\*x,

where x is an n element vector and  A is an n by n unit, or non-unit,
upper or lower triangular band matrix, with ( k + 1 ) diagonals.

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
> TRANS = 'C' or 'c'   x := A\*\*H\*x.

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

K : INTEGER [in]
> On entry with UPLO = 'U' or 'u', K specifies the number of
> super-diagonals of the matrix A.
> On entry with UPLO = 'L' or 'l', K specifies the number of
> sub-diagonals of the matrix A.
> K must satisfy  0 .le. K.

A : COMPLEX\*16 array, dimension ( LDA, N ). [in]
> Before entry with UPLO = 'U' or 'u', the leading ( k + 1 )
> by n part of the array A must contain the upper triangular
> band part of the matrix of coefficients, supplied column by
> column, with the leading diagonal of the matrix in row
> ( k + 1 ) of the array, the first super-diagonal starting at
> position 2 in row k, and so on. The top left k by k triangle
> of the array A is not referenced.
> The following program segment will transfer an upper
> triangular band matrix from conventional full matrix storage
> to band storage:
> 
> DO 20, J = 1, N
> M = K + 1 - J
> DO 10, I = MAX( 1, J - K ), J
> A( M + I, J ) = matrix( I, J )
> 10    CONTINUE
> 20 CONTINUE
> 
> Before entry with UPLO = 'L' or 'l', the leading ( k + 1 )
> by n part of the array A must contain the lower triangular
> band part of the matrix of coefficients, supplied column by
> column, with the leading diagonal of the matrix in row 1 of
> the array, the first sub-diagonal starting at position 1 in
> row 2, and so on. The bottom right k by k triangle of the
> array A is not referenced.
> The following program segment will transfer a lower
> triangular band matrix from conventional full matrix storage
> to band storage:
> 
> DO 20, J = 1, N
> M = 1 - J
> DO 10, I = J, MIN( N, J + K )
> A( M + I, J ) = matrix( I, J )
> 10    CONTINUE
> 20 CONTINUE
> 
> Note that when DIAG = 'U' or 'u' the elements of the array A
> corresponding to the diagonal elements of the matrix are not
> referenced, but are assumed to be unity.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program. LDA must be at least
> ( k + 1 ).

X : COMPLEX\*16 array, dimension at least [in,out]
> ( 1 + ( n - 1 )\*abs( INCX ) ).
> Before entry, the incremented array X must contain the n
> element vector x. On exit, X is overwritten with the
> transformed vector x.

INCX : INTEGER [in]
> On entry, INCX specifies the increment for the elements of
> X. INCX must not be zero.
