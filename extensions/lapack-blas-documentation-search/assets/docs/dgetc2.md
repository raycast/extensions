```fortran
subroutine dgetc2 (
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        integer, dimension( * ) jpiv,
        integer info
)
```

DGETC2 computes an LU factorization with complete pivoting of the
n-by-n matrix A. The factorization has the form A = P \* L \* U \* Q,
where P and Q are permutation matrices, L is lower triangular with
unit diagonal elements and U is upper triangular.

This is the Level 2 BLAS algorithm.

## Parameters
N : INTEGER [in]
> The order of the matrix A. N >= 0.

A : DOUBLE PRECISION array, dimension (LDA, N) [in,out]
> On entry, the n-by-n matrix A to be factored.
> On exit, the factors L and U from the factorization
> A = P\*L\*U\*Q; the unit diagonal elements of L are not stored.
> If U(k, k) appears to be less than SMIN, U(k, k) is given the
> value of SMIN, i.e., giving a nonsingular perturbed system.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension(N). [out]
> The pivot indices; for 1 <= i <= N, row i of the
> matrix has been interchanged with row IPIV(i).

JPIV : INTEGER array, dimension(N). [out]
> The pivot indices; for 1 <= j <= N, column j of the
> matrix has been interchanged with column JPIV(j).

INFO : INTEGER [out]
> = 0: successful exit
> > 0: if INFO = k, U(k, k) is likely to produce overflow if
> we try to solve for x in Ax = b. So U is perturbed to
> avoid the overflow.
