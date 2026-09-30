```fortran
subroutine sgebd2 (
        integer m,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( * ) tauq,
        real, dimension( * ) taup,
        real, dimension( * ) work,
        integer info
)
```

SGEBD2 reduces a real general m by n matrix A to upper or lower
bidiagonal form B by an orthogonal transformation: Q\*\*T \* A \* P = B.

If m >= n, B is upper bidiagonal; if m < n, B is lower bidiagonal.

## Parameters
M : INTEGER [in]
> The number of rows in the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns in the matrix A.  N >= 0.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the m by n general matrix to be reduced.
> On exit,
> if m >= n, the diagonal and the first superdiagonal are
> overwritten with the upper bidiagonal matrix B; the
> elements below the diagonal, with the array TAUQ, represent
> the orthogonal matrix Q as a product of elementary
> reflectors, and the elements above the first superdiagonal,
> with the array TAUP, represent the orthogonal matrix P as
> a product of elementary reflectors;
> if m < n, the diagonal and the first subdiagonal are
> overwritten with the lower bidiagonal matrix B; the
> elements below the first subdiagonal, with the array TAUQ,
> represent the orthogonal matrix Q as a product of
> elementary reflectors, and the elements above the diagonal,
> with the array TAUP, represent the orthogonal matrix P as
> a product of elementary reflectors.
> See Further Details.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

D : REAL array, dimension (min(M,N)) [out]
> The diagonal elements of the bidiagonal matrix B:
> D(i) = A(i,i).

E : REAL array, dimension (min(M,N)-1) [out]
> The off-diagonal elements of the bidiagonal matrix B:
> if m >= n, E(i) = A(i,i+1) for i = 1,2,...,n-1;
> if m < n, E(i) = A(i+1,i) for i = 1,2,...,m-1.

TAUQ : REAL array, dimension (min(M,N)) [out]
> The scalar factors of the elementary reflectors which
> represent the orthogonal matrix Q. See Further Details.

TAUP : REAL array, dimension (min(M,N)) [out]
> The scalar factors of the elementary reflectors which
> represent the orthogonal matrix P. See Further Details.

WORK : REAL array, dimension (max(M,N)) [out]

INFO : INTEGER [out]
> = 0: successful exit.
> < 0: if INFO = -i, the i-th argument had an illegal value.
