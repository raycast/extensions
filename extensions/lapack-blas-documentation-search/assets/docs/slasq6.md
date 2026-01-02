```fortran
subroutine slasq6 (
        integer i0,
        integer n0,
        real, dimension( * ) z,
        integer pp,
        real dmin,
        real dmin1,
        real dmin2,
        real dn,
        real dnm1,
        real dnm2
)
```

SLASQ6 computes one dqd (shift equal to zero) transform in
ping-pong form, with protection against underflow and overflow.

## Parameters
I0 : INTEGER [in]
> First index.

N0 : INTEGER [in]
> Last index.

Z : REAL array, dimension ( 4\*N ) [in]
> Z holds the qd array. EMIN is stored in Z(4\*N0) to avoid
> an extra argument.

PP : INTEGER [in]
> PP=0 for ping, PP=1 for pong.

DMIN : REAL [out]
> Minimum value of d.

DMIN1 : REAL [out]
> Minimum value of d, excluding D( N0 ).

DMIN2 : REAL [out]
> Minimum value of d, excluding D( N0 ) and D( N0-1 ).

DN : REAL [out]
> d(N0), the last value of d.

DNM1 : REAL [out]
> d(N0-1).

DNM2 : REAL [out]
> d(N0-2).
