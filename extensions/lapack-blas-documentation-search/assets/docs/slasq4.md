```fortran
subroutine slasq4 (
        integer i0,
        integer n0,
        real, dimension( * ) z,
        integer pp,
        integer n0in,
        real dmin,
        real dmin1,
        real dmin2,
        real dn,
        real dn1,
        real dn2,
        real tau,
        integer ttype,
        real g
)
```

SLASQ4 computes an approximation TAU to the smallest eigenvalue
using values of d from the previous transform.

## Parameters
I0 : INTEGER [in]
> First index.

N0 : INTEGER [in]
> Last index.

Z : REAL array, dimension ( 4\*N0 ) [in]
> Z holds the qd array.

PP : INTEGER [in]
> PP=0 for ping, PP=1 for pong.

N0IN : INTEGER [in]
> The value of N0 at start of EIGTEST.

DMIN : REAL [in]
> Minimum value of d.

DMIN1 : REAL [in]
> Minimum value of d, excluding D( N0 ).

DMIN2 : REAL [in]
> Minimum value of d, excluding D( N0 ) and D( N0-1 ).

DN : REAL [in]
> d(N)

DN1 : REAL [in]
> d(N-1)

DN2 : REAL [in]
> d(N-2)

TAU : REAL [out]
> This is the shift.

TTYPE : INTEGER [out]
> Shift type.

G : REAL [in,out]
> G is passed as an argument in order to save its value between
> calls to SLASQ4.
