```fortran
subroutine stfsm (
        character transr,
        character side,
        character uplo,
        character trans,
        character diag,
        integer m,
        integer n,
        real alpha,
        real, dimension( 0: * ) a,
        real, dimension( 0: ldb-1, 0: * ) b,
        integer ldb
)
```

Level 3 BLAS like routine for A in RFP Format.

STFSM  solves the matrix equation

op( A )\*X = alpha\*B  or  X\*op( A ) = alpha\*B

where alpha is a scalar, X and B are m by n matrices, A is a unit, or
non-unit,  upper or lower triangular matrix  and  op( A )  is one  of

op( A ) = A   or   op( A ) = A\*\*T.

A is in Rectangular Full Packed (RFP) Format.

The matrix X is overwritten on B.

## Parameters
TRANSR : CHARACTER\*1 [in]
> = 'N':  The Normal Form of RFP A is stored;
> = 'T':  The Transpose Form of RFP A is stored.

SIDE : CHARACTER\*1 [in]
> On entry, SIDE specifies whether op( A ) appears on the left
> or right of X as follows:
> 
> SIDE = 'L' or 'l'   op( A )\*X = alpha\*B.
> 
> SIDE = 'R' or 'r'   X\*op( A ) = alpha\*B.
> 
> Unchanged on exit.

UPLO : CHARACTER\*1 [in]
> On entry, UPLO specifies whether the RFP matrix A came from
> an upper or lower triangular matrix as follows:
> UPLO = 'U' or 'u' RFP A came from an upper triangular matrix
> UPLO = 'L' or 'l' RFP A came from a  lower triangular matrix
> 
> Unchanged on exit.

TRANS : CHARACTER\*1 [in]
> On entry, TRANS  specifies the form of op( A ) to be used
> in the matrix multiplication as follows:
> 
> TRANS  = 'N' or 'n'   op( A ) = A.
> 
> TRANS  = 'T' or 't'   op( A ) = A'.
> 
> Unchanged on exit.

DIAG : CHARACTER\*1 [in]
> On entry, DIAG specifies whether or not RFP A is unit
> triangular as follows:
> 
> DIAG = 'U' or 'u'   A is assumed to be unit triangular.
> 
> DIAG = 'N' or 'n'   A is not assumed to be unit
> triangular.
> 
> Unchanged on exit.

M : INTEGER [in]
> On entry, M specifies the number of rows of B. M must be at
> least zero.
> Unchanged on exit.

N : INTEGER [in]
> On entry, N specifies the number of columns of B.  N must be
> at least zero.
> Unchanged on exit.

ALPHA : REAL [in]
> On entry,  ALPHA specifies the scalar  alpha. When  alpha is
> zero then  A is not referenced and  B need not be set before
> entry.
> Unchanged on exit.

A : REAL array, dimension (NT) [in]
> NT = N\*(N+1)/2 if SIDE='R' and NT = M\*(M+1)/2 otherwise.
> On entry, the matrix A in RFP Format.
> RFP Format is described by TRANSR, UPLO and N as follows:
> If TRANSR='N' then RFP A is (0:N,0:K-1) when N is even;
> K=N/2. RFP A is (0:N-1,0:K) when N is odd; K=N/2. If
> TRANSR = 'T' then RFP is the transpose of RFP A as
> defined when TRANSR = 'N'. The contents of RFP A are defined
> by UPLO as follows: If UPLO = 'U' the RFP A contains the NT
> elements of upper packed A either in normal or
> transpose Format. If UPLO = 'L' the RFP A contains
> the NT elements of lower packed A either in normal or
> transpose Format. The LDA of RFP A is (N+1)/2 when
> TRANSR = 'T'. When TRANSR is 'N' the LDA is N+1 when N is
> even and is N when is odd.
> See the Note below for more details. Unchanged on exit.

B : REAL array, dimension (LDB,N) [in,out]
> Before entry,  the leading  m by n part of the array  B must
> contain  the  right-hand  side  matrix  B,  and  on exit  is
> overwritten by the solution matrix  X.

LDB : INTEGER [in]
> On entry, LDB specifies the first dimension of B as declared
> in  the  calling  (sub)  program.   LDB  must  be  at  least
> max( 1, m ).
> Unchanged on exit.
