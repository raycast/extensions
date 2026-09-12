```fortran
subroutine zla_wwaddw (
        integer n,
        complex*16, dimension( * ) x,
        complex*16, dimension( * ) y,
        complex*16, dimension( * ) w
)
```

ZLA_WWADDW adds a vector W into a doubled-single vector (X, Y).

This works for all extant IBM's hex and binary floating point
arithmetic, but not for decimal.

## Parameters
N : INTEGER [in]
> The length of vectors X, Y, and W.

X : COMPLEX\*16 array, dimension (N) [in,out]
> The first part of the doubled-single accumulation vector.

Y : COMPLEX\*16 array, dimension (N) [in,out]
> The second part of the doubled-single accumulation vector.

W : COMPLEX\*16 array, dimension (N) [in]
> The vector to be added.
