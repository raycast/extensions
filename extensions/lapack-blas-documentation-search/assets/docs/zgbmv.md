```fortran
subroutine zgbmv (
        character trans,
        integer m,
        integer n,
        integer kl,
        integer ku,
        complex*16 alpha,
        complex*16, dimension(lda,*) a,
        integer lda,
        complex*16, dimension(*) x,
        integer incx,
        complex*16 beta,
        complex*16, dimension(*) y,
        integer incy
)
```

ZGBMV  performs one of the matrix-vector operations

y := alpha\*A\*x + beta\*y,   or   y := alpha\*A\*\*T\*x + beta\*y,   or

y := alpha\*A\*\*H\*x + beta\*y,

where alpha and beta are scalars, x and y are vectors and A is an
m by n band matrix, with kl sub-diagonals and ku super-diagonals.

## Parameters
TRANS : CHARACTER\*1 [in]
> On entry, TRANS specifies the operation to be performed as
> follows:
> 
> TRANS = 'N' or 'n'   y := alpha\*A\*x + beta\*y.
> 
> TRANS = 'T' or 't'   y := alpha\*A\*\*T\*x + beta\*y.
> 
> TRANS = 'C' or 'c'   y := alpha\*A\*\*H\*x + beta\*y.

M : INTEGER [in]
> On entry, M specifies the number of rows of the matrix A.
> M must be at least zero.

N : INTEGER [in]
> On entry, N specifies the number of columns of the matrix A.
> N must be at least zero.

KL : INTEGER [in]
> On entry, KL specifies the number of sub-diagonals of the
> matrix A. KL must satisfy  0 .le. KL.

KU : INTEGER [in]
> On entry, KU specifies the number of super-diagonals of the
> matrix A. KU must satisfy  0 .le. KU.

ALPHA : COMPLEX\*16 [in]
> On entry, ALPHA specifies the scalar alpha.

A : COMPLEX\*16 array, dimension ( LDA, N ) [in]
> Before entry, the leading ( kl + ku + 1 ) by n part of the
> array A must contain the matrix of coefficients, supplied
> column by column, with the leading diagonal of the matrix in
> row ( ku + 1 ) of the array, the first super-diagonal
> starting at position 2 in row ku, the first sub-diagonal
> starting at position 1 in row ( ku + 2 ), and so on.
> Elements in the array A that do not correspond to elements
> in the band matrix (such as the top left ku by ku triangle)
> are not referenced.
> The following program segment will transfer a band matrix
> from conventional full matrix storage to band storage:
> 
> DO 20, J = 1, N
> K = KU + 1 - J
> DO 10, I = MAX( 1, J - KU ), MIN( M, J + KL )
> A( K + I, J ) = matrix( I, J )
> 10    CONTINUE
> 20 CONTINUE

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program. LDA must be at least
> ( kl + ku + 1 ).

X : COMPLEX\*16 array, dimension at least [in]
> ( 1 + ( n - 1 )\*abs( INCX ) ) when TRANS = 'N' or 'n'
> and at least
> ( 1 + ( m - 1 )\*abs( INCX ) ) otherwise.
> Before entry, the incremented array X must contain the
> vector x.

INCX : INTEGER [in]
> On entry, INCX specifies the increment for the elements of
> X. INCX must not be zero.

BETA : COMPLEX\*16 [in]
> On entry, BETA specifies the scalar beta. When BETA is
> supplied as zero then Y need not be set on input.

Y : COMPLEX\*16 array, dimension at least [in,out]
> ( 1 + ( m - 1 )\*abs( INCY ) ) when TRANS = 'N' or 'n'
> and at least
> ( 1 + ( n - 1 )\*abs( INCY ) ) otherwise.
> Before entry, the incremented array Y must contain the
> vector y. On exit, Y is overwritten by the updated vector y.
> If either m or n is zero, then Y not referenced and the function
> performs a quick return.

INCY : INTEGER [in]
> On entry, INCY specifies the increment for the elements of
> Y. INCY must not be zero.
