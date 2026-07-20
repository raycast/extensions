```fortran
subroutine claset (
        character uplo,
        integer m,
        integer n,
        complex alpha,
        complex beta,
        complex, dimension( lda, * ) a,
        integer lda
)
```

CLASET initializes a 2-D array A to BETA on the diagonal and
ALPHA on the offdiagonals.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies the part of the matrix A to be set.
> = 'U':      Upper triangular part is set. The lower triangle
> is unchanged.
> = 'L':      Lower triangular part is set. The upper triangle
> is unchanged.
> Otherwise:  All of the matrix A is set.

M : INTEGER [in]
> On entry, M specifies the number of rows of A.

N : INTEGER [in]
> On entry, N specifies the number of columns of A.

ALPHA : COMPLEX [in]
> All the offdiagonal array elements are set to ALPHA.

BETA : COMPLEX [in]
> All the diagonal array elements are set to BETA.

A : COMPLEX array, dimension (LDA,N) [out]
> On entry, the m by n matrix A.
> On exit, A(i,j) = ALPHA, 1 <= i <= m, 1 <= j <= n, i.ne.j;
> A(i,i) = BETA , 1 <= i <= min(m,n)

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).
