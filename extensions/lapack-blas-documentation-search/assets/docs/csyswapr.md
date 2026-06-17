```fortran
subroutine csyswapr (
        character uplo,
        integer n,
        complex, dimension( lda, n ) a,
        integer lda,
        integer i1,
        integer i2
)
```

CSYSWAPR applies an elementary permutation on the rows and the columns of
a symmetric matrix.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*D\*U\*\*T;
> = 'L':  Lower triangular, form is A = L\*D\*L\*\*T.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the N-by-N matrix A. On exit, the permuted matrix
> where the rows I1 and I2 and columns I1 and I2 are interchanged.
> If UPLO = 'U', the interchanges are applied to the upper
> triangular part and the strictly lower triangular part of A is
> not referenced; if UPLO = 'L', the interchanges are applied to
> the lower triangular part and the part of A above the diagonal
> is not referenced.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

I1 : INTEGER [in]
> Index of the first row to swap

I2 : INTEGER [in]
> Index of the second row to swap
