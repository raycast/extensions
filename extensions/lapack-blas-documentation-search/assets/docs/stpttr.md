```fortran
subroutine stpttr (
        character uplo,
        integer n,
        real, dimension( * ) ap,
        real, dimension( lda, * ) a,
        integer lda,
        integer info
)
```

STPTTR copies a triangular matrix A from standard packed format (TP)
to standard full format (TR).

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular.
> = 'L':  A is lower triangular.

N : INTEGER [in]
> The order of the matrix A. N >= 0.

AP : REAL array, dimension ( N\*(N+1)/2 ), [in]
> On entry, the upper or lower triangular matrix A, packed
> columnwise in a linear array. The j-th column of A is stored
> in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.

A : REAL array, dimension ( LDA, N ) [out]
> On exit, the triangular matrix A.  If UPLO = 'U', the leading
> N-by-N upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading N-by-N lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
