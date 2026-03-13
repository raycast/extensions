```fortran
subroutine stftri (
        character transr,
        character uplo,
        character diag,
        integer n,
        real, dimension( 0: * ) a,
        integer info
)
```

STFTRI computes the inverse of a triangular matrix A stored in RFP
format.

This is a Level 3 BLAS version of the algorithm.

## Parameters
TRANSR : CHARACTER\*1 [in]
> = 'N':  The Normal TRANSR of RFP A is stored;
> = 'T':  The Transpose TRANSR of RFP A is stored.

UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

DIAG : CHARACTER\*1 [in]
> = 'N':  A is non-unit triangular;
> = 'U':  A is unit triangular.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : REAL array, dimension (NT); [in,out]
> NT=N\*(N+1)/2. On entry, the triangular factor of a Hermitian
> Positive Definite matrix A in RFP format. RFP format is
> described by TRANSR, UPLO, and N as follows: If TRANSR = 'N'
> then RFP A is (0:N,0:k-1) when N is even; k=N/2. RFP A is
> (0:N-1,0:k) when N is odd; k=N/2. IF TRANSR = 'T' then RFP is
> the transpose of RFP A as defined when
> TRANSR = 'N'. The contents of RFP A are defined by UPLO as
> follows: If UPLO = 'U' the RFP A contains the nt elements of
> upper packed A; If UPLO = 'L' the RFP A contains the nt
> elements of lower packed A. The LDA of RFP A is (N+1)/2 when
> TRANSR = 'T'. When TRANSR is 'N' the LDA is N+1 when N is
> even and N is odd. See the Note below for more details.
> 
> On exit, the (triangular) inverse of the original matrix, in
> the same storage format.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, A(i,i) is exactly zero.  The triangular
> matrix is singular and its inverse can not be computed.
