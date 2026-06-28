```fortran
subroutine sgesc2 (
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) rhs,
        integer, dimension( * ) ipiv,
        integer, dimension( * ) jpiv,
        real scale
)
```

SGESC2 solves a system of linear equations

A \* X = scale\* RHS

with a general N-by-N matrix A using the LU factorization with
complete pivoting computed by SGETC2.

## Parameters
N : INTEGER [in]
> The order of the matrix A.

A : REAL array, dimension (LDA,N) [in]
> On entry, the  LU part of the factorization of the n-by-n
> matrix A computed by SGETC2:  A = P \* L \* U \* Q

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1, N).

RHS : REAL array, dimension (N). [in,out]
> On entry, the right hand side vector b.
> On exit, the solution vector X.

IPIV : INTEGER array, dimension (N). [in]
> The pivot indices; for 1 <= i <= N, row i of the
> matrix has been interchanged with row IPIV(i).

JPIV : INTEGER array, dimension (N). [in]
> The pivot indices; for 1 <= j <= N, column j of the
> matrix has been interchanged with column JPIV(j).

SCALE : REAL [out]
> On exit, SCALE contains the scale factor. SCALE is chosen
> 0 <= SCALE <= 1 to prevent overflow in the solution.
