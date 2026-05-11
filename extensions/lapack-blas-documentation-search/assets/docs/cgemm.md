```fortran
subroutine cgemm (
        character transa,
        character transb,
        integer m,
        integer n,
        integer k,
        complex alpha,
        complex, dimension(lda,*) a,
        integer lda,
        complex, dimension(ldb,*) b,
        integer ldb,
        complex beta,
        complex, dimension(ldc,*) c,
        integer ldc
)
```

CGEMM  performs one of the matrix-matrix operations

C := alpha\*op( A )\*op( B ) + beta\*C,

where  op( X ) is one of

op( X ) = X   or   op( X ) = X\*\*T   or   op( X ) = X\*\*H,

alpha and beta are scalars, and A, B and C are matrices, with op( A )
an m by k matrix,  op( B )  a  k by n matrix and  C an m by n matrix.

## Parameters
TRANSA : CHARACTER\*1 [in]
> On entry, TRANSA specifies the form of op( A ) to be used in
> the matrix multiplication as follows:
> 
> TRANSA = 'N' or 'n',  op( A ) = A.
> 
> TRANSA = 'T' or 't',  op( A ) = A\*\*T.
> 
> TRANSA = 'C' or 'c',  op( A ) = A\*\*H.

TRANSB : CHARACTER\*1 [in]
> On entry, TRANSB specifies the form of op( B ) to be used in
> the matrix multiplication as follows:
> 
> TRANSB = 'N' or 'n',  op( B ) = B.
> 
> TRANSB = 'T' or 't',  op( B ) = B\*\*T.
> 
> TRANSB = 'C' or 'c',  op( B ) = B\*\*H.

M : INTEGER [in]
> On entry,  M  specifies  the number  of rows  of the  matrix
> op( A )  and of the  matrix  C.  M  must  be at least  zero.

N : INTEGER [in]
> On entry,  N  specifies the number  of columns of the matrix
> op( B ) and the number of columns of the matrix C. N must be
> at least zero.

K : INTEGER [in]
> On entry,  K  specifies  the number of columns of the matrix
> op( A ) and the number of rows of the matrix op( B ). K must
> be at least  zero.

ALPHA : COMPLEX [in]
> On entry, ALPHA specifies the scalar alpha.

A : COMPLEX array, dimension ( LDA, ka ), where ka is [in]
> k  when  TRANSA = 'N' or 'n',  and is  m  otherwise.
> Before entry with  TRANSA = 'N' or 'n',  the leading  m by k
> part of the array  A  must contain the matrix  A,  otherwise
> the leading  k by m  part of the array  A  must contain  the
> matrix A.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in the calling (sub) program. When  TRANSA = 'N' or 'n' then
> LDA must be at least  max( 1, m ), otherwise  LDA must be at
> least  max( 1, k ).

B : COMPLEX array, dimension ( LDB, kb ), where kb is [in]
> n  when  TRANSB = 'N' or 'n',  and is  k  otherwise.
> Before entry with  TRANSB = 'N' or 'n',  the leading  k by n
> part of the array  B  must contain the matrix  B,  otherwise
> the leading  n by k  part of the array  B  must contain  the
> matrix B.

LDB : INTEGER [in]
> On entry, LDB specifies the first dimension of B as declared
> in the calling (sub) program. When  TRANSB = 'N' or 'n' then
> LDB must be at least  max( 1, k ), otherwise  LDB must be at
> least  max( 1, n ).

BETA : COMPLEX [in]
> On entry,  BETA  specifies the scalar  beta.  When  BETA  is
> supplied as zero then C need not be set on input.

C : COMPLEX array, dimension ( LDC, N ) [in,out]
> Before entry, the leading  m by n  part of the array  C must
> contain the matrix  C,  except when  beta  is zero, in which
> case C need not be set on entry.
> On exit, the array  C  is overwritten by the  m by n  matrix
> ( alpha\*op( A )\*op( B ) + beta\*C ).

LDC : INTEGER [in]
> On entry, LDC specifies the first dimension of C as declared
> in  the  calling  (sub)  program.   LDC  must  be  at  least
> max( 1, m ).
