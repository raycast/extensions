```fortran
subroutine dlasq5 (
        integer i0,
        integer n0,
        double precision, dimension( * ) z,
        integer pp,
        double precision tau,
        double precision sigma,
        double precision dmin,
        double precision dmin1,
        double precision dmin2,
        double precision dn,
        double precision dnm1,
        double precision dnm2,
        logical ieee,
        double precision eps
)
```

DLASQ5 computes one dqds transform in ping-pong form, one
version for IEEE machines another for non IEEE machines.

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

TAU : DOUBLE PRECISION [in]
> This is the shift.

SIGMA : DOUBLE PRECISION [in]
> This is the accumulated shift up to this step.

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

IEEE : LOGICAL [in]
> Flag for IEEE or non IEEE arithmetic.

EPS : DOUBLE PRECISION [in]
> This is the value of epsilon used.
