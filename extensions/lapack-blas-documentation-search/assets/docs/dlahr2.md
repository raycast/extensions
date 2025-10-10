```fortran
subroutine dlahr2 (
        integer n,
        integer k,
        integer nb,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( nb ) tau,
        double precision, dimension( ldt, nb ) t,
        integer ldt,
        double precision, dimension( ldy, nb ) y,
        integer ldy
)
```

DLAHR2 reduces the first NB columns of A real general n-BY-(n-k+1)
matrix A so that elements below the k-th subdiagonal are zero. The
reduction is performed by an orthogonal similarity transformation
Q\*\*T \* A \* Q. The routine returns the matrices V and T which determine
Q as a block reflector I - V\*T\*V\*\*T, and also the matrix Y = A \* V \* T.

This is an auxiliary routine called by DGEHRD.

## Parameters
N : INTEGER [in]
> The order of the matrix A.

K : INTEGER [in]
> The offset for the reduction. Elements below the k-th
> subdiagonal in the first NB columns are reduced to zero.
> K < N.

NB : INTEGER [in]
> The number of columns to be reduced.

A : DOUBLE PRECISION array, dimension (LDA,N-K+1) [in,out]
> On entry, the n-by-(n-k+1) general matrix A.
> On exit, the elements on and above the k-th subdiagonal in
> the first NB columns are overwritten with the corresponding
> elements of the reduced matrix; the elements below the k-th
> subdiagonal, with the array TAU, represent the matrix Q as a
> product of elementary reflectors. The other columns of A are
> unchanged. See Further Details.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

TAU : DOUBLE PRECISION array, dimension (NB) [out]
> The scalar factors of the elementary reflectors. See Further
> Details.

T : DOUBLE PRECISION array, dimension (LDT,NB) [out]
> The upper triangular matrix T.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= NB.

Y : DOUBLE PRECISION array, dimension (LDY,NB) [out]
> The n-by-nb matrix Y.

LDY : INTEGER [in]
> The leading dimension of the array Y. LDY >= N.
