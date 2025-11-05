```fortran
subroutine strti2 (
        character uplo,
        character diag,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        integer info
)
```

STRTI2 computes the inverse of a real upper or lower triangular
matrix.

This is the Level 2 BLAS version of the algorithm.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the matrix A is upper or lower triangular.
> = 'U':  Upper triangular
> = 'L':  Lower triangular

DIAG : CHARACTER\*1 [in]
> Specifies whether or not the matrix A is unit triangular.
> = 'N':  Non-unit triangular
> = 'U':  Unit triangular

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the triangular matrix A.  If UPLO = 'U', the
> leading n by n upper triangular part of the array A contains
> the upper triangular matrix, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading n by n lower triangular part of the array A contains
> the lower triangular matrix, and the strictly upper
> triangular part of A is not referenced.  If DIAG = 'U', the
> diagonal elements of A are also not referenced and are
> assumed to be 1.
> 
> On exit, the (triangular) inverse of the original matrix, in
> the same storage format.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -k, the k-th argument had an illegal value
