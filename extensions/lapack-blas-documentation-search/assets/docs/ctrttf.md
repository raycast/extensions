```fortran
subroutine ctrttf (
        character transr,
        character uplo,
        integer n,
        complex, dimension( 0: lda-1, 0: * ) a,
        integer lda,
        complex, dimension( 0: * ) arf,
        integer info
)
```

CTRTTF copies a triangular matrix A from standard full format (TR)
to rectangular full packed format (TF) .

## Parameters
TRANSR : CHARACTER\*1 [in]
> = 'N':  ARF in Normal mode is wanted;
> = 'C':  ARF in Conjugate Transpose mode is wanted;

UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX array, dimension ( LDA, N ) [in]
> On entry, the triangular matrix A.  If UPLO = 'U', the
> leading N-by-N upper triangular part of the array A contains
> the upper triangular matrix, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading N-by-N lower triangular part of the array A contains
> the lower triangular matrix, and the strictly upper
> triangular part of A is not referenced.

LDA : INTEGER [in]
> The leading dimension of the matrix A.  LDA >= max(1,N).

ARF : COMPLEX array, dimension ( N\*(N+1)/2 ), [out]
> On exit, the upper or lower triangular matrix A stored in
> RFP format. For a further discussion see Notes below.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
