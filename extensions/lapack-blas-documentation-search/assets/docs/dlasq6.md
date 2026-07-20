```fortran
subroutine dlasq6 (
        integer i0,
        integer n0,
        double precision, dimension( * ) z,
        integer pp,
        double precision dmin,
        double precision dmin1,
        double precision dmin2,
        double precision dn,
        double precision dnm1,
        double precision dnm2
)
```

DLASQ6 computes one dqd (shift equal to zero) transform in
ping-pong form, with protection against underflow and overflow.

## Parameters
I0 : INTEGER [in]
> First index.

N0 : INTEGER [in]
> Last index.

Z : DOUBLE PRECISION array, dimension ( 4\*N ) [in]
> Z holds the qd array. EMIN is stored in Z(4\*N0) to avoid
> an extra argument.

PP : INTEGER [in]
> PP=0 for ping, PP=1 for pong.

DMIN : DOUBLE PRECISION [out]
> Minimum value of d.

DMIN1 : DOUBLE PRECISION [out]
> Minimum value of d, excluding D( N0 ).

DMIN2 : DOUBLE PRECISION [out]
> Minimum value of d, excluding D( N0 ) and D( N0-1 ).

DN : DOUBLE PRECISION [out]
> d(N0), the last value of d.

DNM1 : DOUBLE PRECISION [out]
> d(N0-1).

DNM2 : DOUBLE PRECISION [out]
> d(N0-2).
