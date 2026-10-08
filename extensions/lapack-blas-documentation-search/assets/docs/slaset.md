```fortran
subroutine slaset (
        character uplo,
        integer m,
        integer n,
        real alpha,
        real beta,
        real, dimension( lda, * ) a,
        integer lda
)
```

SLASET initializes an m-by-n matrix A to BETA on the diagonal and
ALPHA on the offdiagonals.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies the part of the matrix A to be set.
> = 'U':      Upper triangular part is set; the strictly lower
> triangular part of A is not changed.
> = 'L':      Lower triangular part is set; the strictly upper
> triangular part of A is not changed.
> Otherwise:  All of the matrix A is set.

M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

ALPHA : REAL [in]
> The constant to which the offdiagonal elements are to be set.

BETA : REAL [in]
> The constant to which the diagonal elements are to be set.

A : REAL array, dimension (LDA,N) [out]
> On exit, the leading m-by-n submatrix of A is set as follows:
> 
> if UPLO = 'U', A(i,j) = ALPHA, 1<=i<=j-1, 1<=j<=n,
> if UPLO = 'L', A(i,j) = ALPHA, j+1<=i<=m, 1<=j<=n,
> otherwise,     A(i,j) = ALPHA, 1<=i<=m, 1<=j<=n, i.ne.j,
> 
> and, for all UPLO, A(i,i) = BETA, 1<=i<=min(m,n).

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).
