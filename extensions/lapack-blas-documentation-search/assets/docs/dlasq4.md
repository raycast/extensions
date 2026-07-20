```fortran
subroutine dlasq4 (
        integer i0,
        integer n0,
        double precision, dimension( * ) z,
        integer pp,
        integer n0in,
        double precision dmin,
        double precision dmin1,
        double precision dmin2,
        double precision dn,
        double precision dn1,
        double precision dn2,
        double precision tau,
        integer ttype,
        double precision g
)
```

DLASQ4 computes an approximation TAU to the smallest eigenvalue
using values of d from the previous transform.

## Parameters
I0 : INTEGER [in]
> First index.

N0 : INTEGER [in]
> Last index.

Z : DOUBLE PRECISION array, dimension ( 4\*N0 ) [in]
> Z holds the qd array.

PP : INTEGER [in]
> PP=0 for ping, PP=1 for pong.

N0IN : INTEGER [in]
> The value of N0 at start of EIGTEST.

DMIN : DOUBLE PRECISION [in]
> Minimum value of d.

DMIN1 : DOUBLE PRECISION [in]
> Minimum value of d, excluding D( N0 ).

DMIN2 : DOUBLE PRECISION [in]
> Minimum value of d, excluding D( N0 ) and D( N0-1 ).

DN : DOUBLE PRECISION [in]
> d(N)

DN1 : DOUBLE PRECISION [in]
> d(N-1)

DN2 : DOUBLE PRECISION [in]
> d(N-2)

TAU : DOUBLE PRECISION [out]
> This is the shift.

TTYPE : INTEGER [out]
> Shift type.

G : DOUBLE PRECISION [in,out]
> G is passed as an argument in order to save its value between
> calls to DLASQ4.
