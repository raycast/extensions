```fortran
subroutine dtrsm (
        character side,
        character uplo,
        character transa,
        character diag,
        integer m,
        integer n,
        double precision alpha,
        double precision, dimension(lda,*) a,
        integer lda,
        double precision, dimension(ldb,*) b,
        integer ldb
)
```

DTRSM  solves one of the matrix equations

op( A )\*X = alpha\*B,   or   X\*op( A ) = alpha\*B,

where alpha is a scalar, X and B are m by n matrices, A is a unit, or
non-unit,  upper or lower triangular matrix  and  op( A )  is one  of

op( A ) = A   or   op( A ) = A\*\*T.

The matrix X is overwritten on B.

## Parameters
SIDE : CHARACTER\*1 [in]
> On entry, SIDE specifies whether op( A ) appears on the left
> or right of X as follows:
> 
> SIDE = 'L' or 'l'   op( A )\*X = alpha\*B.
> 
> SIDE = 'R' or 'r'   X\*op( A ) = alpha\*B.

UPLO : CHARACTER\*1 [in]
> On entry, UPLO specifies whether the matrix A is an upper or
> lower triangular matrix as follows:
> 
> UPLO = 'U' or 'u'   A is an upper triangular matrix.
> 
> UPLO = 'L' or 'l'   A is a lower triangular matrix.

TRANSA : CHARACTER\*1 [in]
> On entry, TRANSA specifies the form of op( A ) to be used in
> the matrix multiplication as follows:
> 
> TRANSA = 'N' or 'n'   op( A ) = A.
> 
> TRANSA = 'T' or 't'   op( A ) = A\*\*T.
> 
> TRANSA = 'C' or 'c'   op( A ) = A\*\*T.

DIAG : CHARACTER\*1 [in]
> On entry, DIAG specifies whether or not A is unit triangular
> as follows:
> 
> DIAG = 'U' or 'u'   A is assumed to be unit triangular.
> 
> DIAG = 'N' or 'n'   A is not assumed to be unit
> triangular.

M : INTEGER [in]
> On entry, M specifies the number of rows of B. M must be at
> least zero.

N : INTEGER [in]
> On entry, N specifies the number of columns of B.  N must be
> at least zero.

ALPHA : DOUBLE PRECISION. [in]
> On entry,  ALPHA specifies the scalar  alpha. When  alpha is
> zero then  A is not referenced and  B need not be set before
> entry.

A : DOUBLE PRECISION array, dimension ( LDA, k ), [in]
> where k is m when SIDE = 'L' or 'l'
> and k is n when SIDE = 'R' or 'r'.
> Before entry  with  UPLO = 'U' or 'u',  the  leading  k by k
> upper triangular part of the array  A must contain the upper
> triangular matrix  and the strictly lower triangular part of
> A is not referenced.
> Before entry  with  UPLO = 'L' or 'l',  the  leading  k by k
> lower triangular part of the array  A must contain the lower
> triangular matrix  and the strictly upper triangular part of
> A is not referenced.
> Note that when  DIAG = 'U' or 'u',  the diagonal elements of
> A  are not referenced either,  but are assumed to be  unity.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program.  When  SIDE = 'L' or 'l'  then
> LDA  must be at least  max( 1, m ),  when  SIDE = 'R' or 'r'
> then LDA must be at least max( 1, n ).

B : DOUBLE PRECISION array, dimension ( LDB, N ) [in,out]
> Before entry,  the leading  m by n part of the array  B must
> contain  the  right-hand  side  matrix  B,  and  on exit  is
> overwritten by the solution matrix  X.

LDB : INTEGER [in]
> On entry, LDB specifies the first dimension of B as declared
> in  the  calling  (sub)  program.   LDB  must  be  at  least
> max( 1, m ).
