```fortran
subroutine zlacgv (
        integer n,
        complex*16, dimension( * ) x,
        integer incx
)
```

ZLACGV conjugates a complex vector of length N.

## Parameters
N : INTEGER [in]
> The length of the vector X.  N >= 0.

X : COMPLEX\*16 array, dimension [in,out]
> (1+(N-1)\*abs(INCX))
> On entry, the vector of length N to be conjugated.
> On exit, X is overwritten with conjg(X).

INCX : INTEGER [in]
> The spacing between successive elements of X.
