```fortran
subroutine chfrk (
        character transr,
        character uplo,
        character trans,
        integer n,
        integer k,
        real alpha,
        complex, dimension( lda, * ) a,
        integer lda,
        real beta,
        complex, dimension( * ) c
)
```

Level 3 BLAS like routine for C in RFP Format.

CHFRK performs one of the Hermitian rank--k operations

C := alpha\*A\*A\*\*H + beta\*C,

or

C := alpha\*A\*\*H\*A + beta\*C,

where alpha and beta are real scalars, C is an n--by--n Hermitian
matrix and A is an n--by--k matrix in the first case and a k--by--n
matrix in the second case.

## Parameters
TRANSR : CHARACTER\*1 [in]
> = 'N':  The Normal Form of RFP A is stored;
> = 'C':  The Conjugate-transpose Form of RFP A is stored.

UPLO : CHARACTER\*1 [in]
> On  entry,   UPLO  specifies  whether  the  upper  or  lower
> triangular  part  of the  array  C  is to be  referenced  as
> follows:
> 
> UPLO = 'U' or 'u'   Only the  upper triangular part of  C
> is to be referenced.
> 
> UPLO = 'L' or 'l'   Only the  lower triangular part of  C
> is to be referenced.
> 
> Unchanged on exit.

TRANS : CHARACTER\*1 [in]
> On entry,  TRANS  specifies the operation to be performed as
> follows:
> 
> TRANS = 'N' or 'n'   C := alpha\*A\*A\*\*H + beta\*C.
> 
> TRANS = 'C' or 'c'   C := alpha\*A\*\*H\*A + beta\*C.
> 
> Unchanged on exit.

N : INTEGER [in]
> On entry,  N specifies the order of the matrix C.  N must be
> at least zero.
> Unchanged on exit.

K : INTEGER [in]
> On entry with  TRANS = 'N' or 'n',  K  specifies  the number
> of  columns   of  the   matrix   A,   and  on   entry   with
> TRANS = 'C' or 'c',  K  specifies  the number of rows of the
> matrix A.  K must be at least zero.
> Unchanged on exit.

ALPHA : REAL [in]
> On entry, ALPHA specifies the scalar alpha.
> Unchanged on exit.

A : COMPLEX array, dimension (LDA,ka) [in]
> where KA
> is K  when TRANS = 'N' or 'n', and is N otherwise. Before
> entry with TRANS = 'N' or 'n', the leading N--by--K part of
> the array A must contain the matrix A, otherwise the leading
> K--by--N part of the array A must contain the matrix A.
> Unchanged on exit.

LDA : INTEGER [in]
> On entry, LDA specifies the first dimension of A as declared
> in  the  calling  (sub)  program.   When  TRANS = 'N' or 'n'
> then  LDA must be at least  max( 1, n ), otherwise  LDA must
> be at least  max( 1, k ).
> Unchanged on exit.

BETA : REAL [in]
> On entry, BETA specifies the scalar beta.
> Unchanged on exit.

C : COMPLEX array, dimension (N\*(N+1)/2) [in,out]
> On entry, the matrix A in RFP Format. RFP Format is
> described by TRANSR, UPLO and N. Note that the imaginary
> parts of the diagonal elements need not be set, they are
> assumed to be zero, and on exit they are set to zero.
