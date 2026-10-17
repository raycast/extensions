```fortran
subroutine zlauum (
        character uplo,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        integer info
)
```

ZLAUUM computes the product U \* U\*\*H or L\*\*H \* L, where the triangular
factor U or L is stored in the upper or lower triangular part of
the array A.

If UPLO = 'U' or 'u' then the upper triangle of the result is stored,
overwriting the factor U in A.
If UPLO = 'L' or 'l' then the lower triangle of the result is stored,
overwriting the factor L in A.

This is the blocked form of the algorithm, calling Level 3 BLAS.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the triangular factor stored in the array A
> is upper or lower triangular:
> = 'U':  Upper triangular
> = 'L':  Lower triangular

N : INTEGER [in]
> The order of the triangular factor U or L.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the triangular factor U or L.
> On exit, if UPLO = 'U', the upper triangle of A is
> overwritten with the upper triangle of the product U \* U\*\*H;
> if UPLO = 'L', the lower triangle of A is overwritten with
> the lower triangle of the product L\*\*H \* L.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -k, the k-th argument had an illegal value
