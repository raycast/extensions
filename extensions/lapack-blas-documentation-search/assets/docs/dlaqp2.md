```fortran
subroutine dlaqp2 (
        integer m,
        integer n,
        integer offset,
        double precision, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) jpvt,
        double precision, dimension( * ) tau,
        double precision, dimension( * ) vn1,
        double precision, dimension( * ) vn2,
        double precision, dimension( * ) work
)
```

DLAQP2 computes a QR factorization with column pivoting of
the block A(OFFSET+1:M,1:N).
The block A(1:OFFSET,1:N) is accordingly pivoted, but not factorized.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A. N >= 0.

OFFSET : INTEGER [in]
> The number of rows of the matrix A that must be pivoted
> but no factorized. OFFSET >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit, the upper triangle of block A(OFFSET+1:M,1:N) is
> the triangular factor obtained; the elements in block
> A(OFFSET+1:M,1:N) below the diagonal, together with the
> array TAU, represent the orthogonal matrix Q as a product of
> elementary reflectors. Block A(1:OFFSET,1:N) has been
> accordingly pivoted, but no factorized.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,M).

JPVT : INTEGER array, dimension (N) [in,out]
> On entry, if JPVT(i) .ne. 0, the i-th column of A is permuted
> to the front of A\*P (a leading column); if JPVT(i) = 0,
> the i-th column of A is a free column.
> On exit, if JPVT(i) = k, then the i-th column of A\*P
> was the k-th column of A.

TAU : DOUBLE PRECISION array, dimension (min(M,N)) [out]
> The scalar factors of the elementary reflectors.

VN1 : DOUBLE PRECISION array, dimension (N) [in,out]
> The vector with the partial column norms.

VN2 : DOUBLE PRECISION array, dimension (N) [in,out]
> The vector with the exact column norms.

WORK : DOUBLE PRECISION array, dimension (N) [out]
