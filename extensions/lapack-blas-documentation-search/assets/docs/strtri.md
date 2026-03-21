```fortran
subroutine strtri (
        character uplo,
        character diag,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        integer info
)
```

STRTRI computes the inverse of a real upper or lower triangular
matrix A.

This is the Level 3 BLAS version of the algorithm.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

DIAG : CHARACTER\*1 [in]
> = 'N':  A is non-unit triangular;
> = 'U':  A is unit triangular.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the triangular matrix A.  If UPLO = 'U', the
> leading N-by-N upper triangular part of the array A contains
> the upper triangular matrix, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading N-by-N lower triangular part of the array A contains
> the lower triangular matrix, and the strictly upper
> triangular part of A is not referenced.  If DIAG = 'U', the
> diagonal elements of A are also not referenced and are
> assumed to be 1.
> On exit, the (triangular) inverse of the original matrix, in
> the same storage format.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, A(i,i) is exactly zero.  The triangular
> matrix is singular and its inverse can not be computed.
