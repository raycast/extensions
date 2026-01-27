```fortran
subroutine ctfttr (
        character transr,
        character uplo,
        integer n,
        complex, dimension( 0: * ) arf,
        complex, dimension( 0: lda-1, 0: * ) a,
        integer lda,
        integer info
)
```

CTFTTR copies a triangular matrix A from rectangular full packed
format (TF) to standard full format (TR).

## Parameters
TRANSR : CHARACTER\*1 [in]
> = 'N':  ARF is in Normal format;
> = 'C':  ARF is in Conjugate-transpose format;

UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

ARF : COMPLEX array, dimension ( N\*(N+1)/2 ), [in]
> On entry, the upper or lower triangular matrix A stored in
> RFP format. For a further discussion see Notes below.

A : COMPLEX array, dimension ( LDA, N ) [out]
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
