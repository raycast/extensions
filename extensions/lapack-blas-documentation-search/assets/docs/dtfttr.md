```fortran
subroutine dtfttr (
        character transr,
        character uplo,
        integer n,
        double precision, dimension( 0: * ) arf,
        double precision, dimension( 0: lda-1, 0: * ) a,
        integer lda,
        integer info
)
```

DTFTTR copies a triangular matrix A from rectangular full packed
format (TF) to standard full format (TR).

## Parameters
TRANSR : CHARACTER\*1 [in]
> = 'N':  ARF is in Normal format;
> = 'T':  ARF is in Transpose format.

UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

N : INTEGER [in]
> The order of the matrices ARF and A. N >= 0.

ARF : DOUBLE PRECISION array, dimension (N\*(N+1)/2). [in]
> On entry, the upper (if UPLO = 'U') or lower (if UPLO = 'L')
> matrix A in RFP format. See the  below for more
> details.

A : DOUBLE PRECISION array, dimension (LDA,N) [out]
> On exit, the triangular matrix A.  If UPLO = 'U', the
> leading N-by-N upper triangular part of the array A contains
> the upper triangular matrix, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading N-by-N lower triangular part of the array A contains
> the lower triangular matrix, and the strictly upper
> triangular part of A is not referenced.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
