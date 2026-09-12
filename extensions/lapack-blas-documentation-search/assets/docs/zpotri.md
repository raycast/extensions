```fortran
subroutine zpotri (
        character uplo,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        integer info
)
```

ZPOTRI computes the inverse of a complex Hermitian positive definite
matrix A using the Cholesky factorization A = U\*\*H\*U or A = L\*L\*\*H
computed by ZPOTRF.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the triangular factor U or L from the Cholesky
> factorization A = U\*\*H\*U or A = L\*L\*\*H, as computed by
> ZPOTRF.
> On exit, the upper or lower triangle of the (Hermitian)
> inverse of A, overwriting the input factor U or L.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the (i,i) element of the factor U or L is
> zero, and the inverse could not be computed.
