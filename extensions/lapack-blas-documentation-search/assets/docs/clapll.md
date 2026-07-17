```fortran
subroutine clapll (
        integer n,
        complex, dimension( * ) x,
        integer incx,
        complex, dimension( * ) y,
        integer incy,
        real ssmin
)
```

Given two column vectors X and Y, let

A = ( X Y ).

The subroutine first computes the QR factorization of A = Q\*R,
and then computes the SVD of the 2-by-2 upper triangular matrix R.
The smaller singular value of R is returned in SSMIN, which is used
as the measurement of the linear dependency of the vectors X and Y.

## Parameters
N : INTEGER [in]
> The length of the vectors X and Y.

X : COMPLEX array, dimension (1+(N-1)\*INCX) [in,out]
> On entry, X contains the N-vector X.
> On exit, X is overwritten.

INCX : INTEGER [in]
> The increment between successive elements of X. INCX > 0.

Y : COMPLEX array, dimension (1+(N-1)\*INCY) [in,out]
> On entry, Y contains the N-vector Y.
> On exit, Y is overwritten.

INCY : INTEGER [in]
> The increment between successive elements of Y. INCY > 0.

SSMIN : REAL [out]
> The smallest singular value of the N-by-2 matrix A = ( X Y ).
