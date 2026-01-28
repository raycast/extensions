```fortran
subroutine dtbsv (
        character uplo,
        character trans,
        character diag,
        integer n,
        integer k,
        double precision, dimension(lda,*) a,
        integer lda,
        double precision, dimension(*) x,
        integer incx
)
```

DTBSV  solves one of the systems of equations

A\*x = b,   or   A\*\*T\*x = b,

where b and x are n element vectors and A is an n by n unit, or
non-unit, upper or lower triangular band matrix, with ( k + 1 )
diagonals.

No test for singularity or near-singularity is included in this
routine. Such tests must be performed before calling this routine.

## Parameters
UPLO : CHARACTER\*1 [in]
> On entry, UPLO specifies whether the matrix is an upper or
> lower triangular matrix as follows:
> 
> UPLO = 'U' or 'u'   A is an upper triangular matrix.
> 
> UPLO = 'L' or 'l'   A is a lower triangular matrix.

TRANS : CHARACTER\*1 [in]
> On entry, TRANS specifies the equations to be solved as
> follows:
> 
> TRANS = 'N' or 'n'   A\*x = b.
> 
> TRANS = 'T' or 't'   A\*\*T\*x = b.
> 
> TRANS = 'C' or 'c'   A\*\*T\*x = b.

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

A : DOUBLE PRECISION array, dimension ( LDA, N ) [in]
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

X : DOUBLE PRECISION array, dimension at least [in,out]
> ( 1 + ( n - 1 )\*abs( INCX ) ).
> Before entry, the incremented array X must contain the n
> element right-hand side vector b. On exit, X is overwritten
> with the solution vector x.

INCX : INTEGER [in]
> On entry, INCX specifies the increment for the elements of
> X. INCX must not be zero.
