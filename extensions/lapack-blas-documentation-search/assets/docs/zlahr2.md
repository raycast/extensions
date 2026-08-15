```fortran
subroutine zlahr2 (
        integer n,
        integer k,
        integer nb,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( nb ) tau,
        complex*16, dimension( ldt, nb ) t,
        integer ldt,
        complex*16, dimension( ldy, nb ) y,
        integer ldy
)
```

ZLAHR2 reduces the first NB columns of A complex general n-BY-(n-k+1)
matrix A so that elements below the k-th subdiagonal are zero. The
reduction is performed by an unitary similarity transformation
Q\*\*H \* A \* Q. The routine returns the matrices V and T which determine
Q as a block reflector I - V\*T\*V\*\*H, and also the matrix Y = A \* V \* T.

This is an auxiliary routine called by ZGEHRD.

## Parameters
N : INTEGER [in]
> The order of the matrix A.

K : INTEGER [in]
> The offset for the reduction. Elements below the k-th
> subdiagonal in the first NB columns are reduced to zero.
> K < N.

NB : INTEGER [in]
> The number of columns to be reduced.

A : COMPLEX\*16 array, dimension (LDA,N-K+1) [in,out]
> On entry, the n-by-(n-k+1) general matrix A.
> On exit, the elements on and above the k-th subdiagonal in
> the first NB columns are overwritten with the corresponding
> elements of the reduced matrix; the elements below the k-th
> subdiagonal, with the array TAU, represent the matrix Q as a
> product of elementary reflectors. The other columns of A are
> unchanged. See Further Details.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

TAU : COMPLEX\*16 array, dimension (NB) [out]
> The scalar factors of the elementary reflectors. See Further
> Details.

T : COMPLEX\*16 array, dimension (LDT,NB) [out]
> The upper triangular matrix T.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= NB.

Y : COMPLEX\*16 array, dimension (LDY,NB) [out]
> The n-by-nb matrix Y.

LDY : INTEGER [in]
> The leading dimension of the array Y. LDY >= N.
