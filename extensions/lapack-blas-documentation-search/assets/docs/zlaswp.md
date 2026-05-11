```fortran
subroutine zlaswp (
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        integer k1,
        integer k2,
        integer, dimension( * ) ipiv,
        integer incx
)
```

ZLASWP performs a series of row interchanges on the matrix A.
One row interchange is initiated for each of rows K1 through K2 of A.

## Parameters
N : INTEGER [in]
> The number of columns of the matrix A.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the matrix of column dimension N to which the row
> interchanges will be applied.
> On exit, the permuted matrix.

LDA : INTEGER [in]
> The leading dimension of the array A.

K1 : INTEGER [in]
> The first element of IPIV for which a row interchange will
> be done.

K2 : INTEGER [in]
> (K2-K1+1) is the number of elements of IPIV for which a row
> interchange will be done.

IPIV : INTEGER array, dimension (K1+(K2-K1)\*abs(INCX)) [in]
> The vector of pivot indices. Only the elements in positions
> K1 through K1+(K2-K1)\*abs(INCX) of IPIV are accessed.
> IPIV(K1+(K-K1)\*abs(INCX)) = L implies rows K and L are to be
> interchanged.

INCX : INTEGER [in]
> The increment between successive values of IPIV. If INCX
> is negative, the pivots are applied in reverse order.
