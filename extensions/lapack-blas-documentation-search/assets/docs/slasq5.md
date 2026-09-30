```fortran
subroutine slasq5 (
        integer i0,
        integer n0,
        real, dimension( * ) z,
        integer pp,
        real tau,
        real sigma,
        real dmin,
        real dmin1,
        real dmin2,
        real dn,
        real dnm1,
        real dnm2,
        logical ieee,
        real eps
)
```

SLASQ5 computes one dqds transform in ping-pong form, one
version for IEEE machines another for non IEEE machines.

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

TAU : REAL [in]
> This is the shift.

SIGMA : REAL [in]
> This is the accumulated shift up to this step.

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

IEEE : LOGICAL [in]
> Flag for IEEE or non IEEE arithmetic.

EPS : REAL [in]
> This is the value of epsilon used.
