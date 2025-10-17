```fortran
subroutine ssymm (
        character side,
        character uplo,
        integer m,
        integer n,
        real alpha,
        real, dimension(lda,*) a,
        integer lda,
        real, dimension(ldb,*) b,
        integer ldb,
        real beta,
        real, dimension(ldc,*) c,
        integer ldc
)
```

SSYMM  performs one of the matrix-matrix operations

C := alpha\*A\*B + beta\*C,

or

C := alpha\*B\*A + beta\*C,

where alpha and beta are scalars,  A is a symmetric matrix and  B and
C are  m by n matrices.

## Parameters
SIDE : CHARACTER\*1 [in]
> On entry,  SIDE  specifies whether  the  symmetric matrix  A
> appears on the  left or right  in the  operation as follows:
> 
> SIDE = 'L' or 'l'   C := alpha\*A\*B + beta\*C,
> 
> SIDE = 'R' or 'r'   C := alpha\*B\*A + beta\*C,

UPLO : CHARACTER\*1 [in]
> On  entry,   UPLO  specifies  whether  the  upper  or  lower
> triangular  part  of  the  symmetric  matrix   A  is  to  be
> referenced as follows:
> 
> UPLO = 'U' or 'u'   Only the upper triangular part of the
> symmetric matrix is to be referenced.
> 
> UPLO = 'L' or 'l'   Only the lower triangular part of the
> symmetric matrix is to be referenced.

M : INTEGER [in]
> On entry,  M  specifies the number of rows of the matrix  C.
> M  must be at least zero.

N : INTEGER [in]
> On entry, N specifies the number of columns of the matrix C.
> N  must be at least zero.

ALPHA : REAL [in]
> On entry, ALPHA specifies the scalar alpha.

A : REAL array, dimension ( LDA, ka ), where ka is [in]
> m  when  SIDE = 'L' or 'l'  and is  n otherwise.
> Before entry  with  SIDE = 'L' or 'l',  the  m by m  part of
> the array  A  must contain the  symmetric matrix,  such that
> when  UPLO = 'U' or 'u', the leading m by m upper triangular
> part of the array  A  must contain the upper triangular part
> of the  symmetric matrix and the  strictly  lower triangular
> part of  A  is not referenced,  and when  UPLO = 'L' or 'l',
> the leading  m by m  lower triangular part  of the  array  A
> must  contain  the  lower triangular part  of the  symmetric
> matrix and the  strictly upper triangular part of  A  is not
> referenced.
> Before entry  with  SIDE = 'R' or 'r',  the  n by n  part of
> the array  A  must contain the  symmetric matrix,  such that
> when  UPLO = 'U' or 'u', the leading n by n upper triangular
> part of the array  A  must contain the upper triangular part
> of the  symmetric matrix and the  strictly  lower triangular
> part of  A  is not referenced,  and when  UPLO = 'L' or 'l',
> the leading  n by n  lower triangular part  of the  array  A
> must  contain  the  lower triangular part  of the  symmetric
> matrix and the  strictly upper triangular part of  A  is not
> referenced.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program.  When  SIDE = 'L' or 'l'  then
> LDA must be at least  max( 1, m ), otherwise  LDA must be at
> least  max( 1, n ).

B : REAL array, dimension ( LDB, N ) [in]
> Before entry, the leading  m by n part of the array  B  must
> contain the matrix B.

LDB : INTEGER [in]
> On entry, LDB specifies the first dimension of B as declared
> in  the  calling  (sub)  program.   LDB  must  be  at  least
> max( 1, m ).

BETA : REAL [in]
> On entry,  BETA  specifies the scalar  beta.  When  BETA  is
> supplied as zero then C need not be set on input.

C : REAL array, dimension ( LDC, N ) [in,out]
> Before entry, the leading  m by n  part of the array  C must
> contain the matrix  C,  except when  beta  is zero, in which
> case C need not be set on entry.
> On exit, the array  C  is overwritten by the  m by n updated
> matrix.

LDC : INTEGER [in]
> On entry, LDC specifies the first dimension of C as declared
> in  the  calling  (sub)  program.   LDC  must  be  at  least
> max( 1, m ).
