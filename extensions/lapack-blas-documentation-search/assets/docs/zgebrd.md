```fortran
subroutine zgebrd (
        integer m,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        complex*16, dimension( * ) tauq,
        complex*16, dimension( * ) taup,
        complex*16, dimension( * ) work,
        integer lwork,
        integer info
)
```

ZGEBRD reduces a general complex M-by-N matrix A to upper or lower
bidiagonal form B by a unitary transformation: Q\*\*H \* A \* P = B.

If m >= n, B is upper bidiagonal; if m < n, B is lower bidiagonal.

## Parameters
M : INTEGER [in]
> The number of rows in the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns in the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the M-by-N general matrix to be reduced.
> On exit,
> if m >= n, the diagonal and the first superdiagonal are
> overwritten with the upper bidiagonal matrix B; the
> elements below the diagonal, with the array TAUQ, represent
> the unitary matrix Q as a product of elementary
> reflectors, and the elements above the first superdiagonal,
> with the array TAUP, represent the unitary matrix P as
> a product of elementary reflectors;
> if m < n, the diagonal and the first subdiagonal are
> overwritten with the lower bidiagonal matrix B; the
> elements below the first subdiagonal, with the array TAUQ,
> represent the unitary matrix Q as a product of
> elementary reflectors, and the elements above the diagonal,
> with the array TAUP, represent the unitary matrix P as
> a product of elementary reflectors.
> See Further Details.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

D : DOUBLE PRECISION array, dimension (min(M,N)) [out]
> The diagonal elements of the bidiagonal matrix B:
> D(i) = A(i,i).

E : DOUBLE PRECISION array, dimension (min(M,N)-1) [out]
> The off-diagonal elements of the bidiagonal matrix B:
> if m >= n, E(i) = A(i,i+1) for i = 1,2,...,n-1;
> if m < n, E(i) = A(i+1,i) for i = 1,2,...,m-1.

TAUQ : COMPLEX\*16 array, dimension (min(M,N)) [out]
> The scalar factors of the elementary reflectors which
> represent the unitary matrix Q. See Further Details.

TAUP : COMPLEX\*16 array, dimension (min(M,N)) [out]
> The scalar factors of the elementary reflectors which
> represent the unitary matrix P. See Further Details.

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The length of the array WORK.
> LWORK >= 1, if MIN(M,N) = 0, and LWORK >= MAX(M,N), otherwise.
> For optimum performance LWORK >= (M+N)\*NB, where NB
> is the optimal blocksize.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
