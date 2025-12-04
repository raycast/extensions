```fortran
subroutine dlaed6 (
        integer kniter,
        logical orgati,
        double precision rho,
        double precision, dimension( 3 ) d,
        double precision, dimension( 3 ) z,
        double precision finit,
        double precision tau,
        integer info
)
```

DLAED6 computes the positive or negative root (closest to the origin)
of
z(1)        z(2)        z(3)
f(x) =   rho + --------- + ---------- + ---------
d(1)-x      d(2)-x      d(3)-x

It is assumed that

if ORGATI = .true. the root is between d(2) and d(3);
otherwise it is between d(1) and d(2)

This routine will be called by DLAED4 when necessary. In most cases,
the root sought is the smallest in magnitude, though it might not be
in some extremely rare situations.

## Parameters
KNITER : INTEGER [in]
> Refer to DLAED4 for its significance.

ORGATI : LOGICAL [in]
> If ORGATI is true, the needed root is between d(2) and
> d(3); otherwise it is between d(1) and d(2).  See
> DLAED4 for further details.

RHO : DOUBLE PRECISION [in]
> Refer to the equation f(x) above.

D : DOUBLE PRECISION array, dimension (3) [in]
> D satisfies d(1) < d(2) < d(3).

Z : DOUBLE PRECISION array, dimension (3) [in]
> Each of the elements in z must be positive.

FINIT : DOUBLE PRECISION [in]
> The value of f at 0. It is more accurate than the one
> evaluated inside this routine (if someone wants to do
> so).

TAU : DOUBLE PRECISION [out]
> The root of the equation f(x).

INFO : INTEGER [out]
> = 0: successful exit
> > 0: if INFO = 1, failure to converge
