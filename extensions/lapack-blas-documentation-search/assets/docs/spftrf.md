```fortran
subroutine spftrf (
        character transr,
        character uplo,
        integer n,
        real, dimension( 0: * ) a,
        integer info
)
```

SPFTRF computes the Cholesky factorization of a real symmetric
positive definite matrix A.

The factorization has the form
A = U\*\*T \* U,  if UPLO = 'U', or
A = L  \* L\*\*T,  if UPLO = 'L',
where U is an upper triangular matrix and L is lower triangular.

This is the block version of the algorithm, calling Level 3 BLAS.

## Parameters
TRANSR : CHARACTER\*1 [in]
> = 'N':  The Normal TRANSR of RFP A is stored;
> = 'T':  The Transpose TRANSR of RFP A is stored.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of RFP A is stored;
> = 'L':  Lower triangle of RFP A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : REAL array, dimension ( N\*(N+1)/2 ); [in,out]
> On entry, the symmetric matrix A in RFP format. RFP format is
> described by TRANSR, UPLO, and N as follows: If TRANSR = 'N'
> then RFP A is (0:N,0:k-1) when N is even; k=N/2. RFP A is
> (0:N-1,0:k) when N is odd; k=N/2. IF TRANSR = 'T' then RFP is
> the transpose of RFP A as defined when
> TRANSR = 'N'. The contents of RFP A are defined by UPLO as
> follows: If UPLO = 'U' the RFP A contains the NT elements of
> upper packed A. If UPLO = 'L' the RFP A contains the elements
> of lower packed A. The LDA of RFP A is (N+1)/2 when TRANSR =
> 'T'. When TRANSR is 'N' the LDA is N+1 when N is even and N
> is odd. See the Note below for more details.
> 
> On exit, if INFO = 0, the factor U or L from the Cholesky
> factorization RFP A = U\*\*T\*U or RFP A = L\*L\*\*T.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the leading principal minor of order i
> is not positive, and the factorization could not be
> completed.
