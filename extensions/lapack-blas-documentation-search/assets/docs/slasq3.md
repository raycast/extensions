```fortran
subroutine slasq3 (
        integer i0,
        integer n0,
        real, dimension( * ) z,
        integer pp,
        real dmin,
        real sigma,
        real desig,
        real qmax,
        integer nfail,
        integer iter,
        integer ndiv,
        logical ieee,
        integer ttype,
        real dmin1,
        real dmin2,
        real dn,
        real dn1,
        real dn2,
        real g,
        real tau
)
```

SLASQ3 checks for deflation, computes a shift (TAU) and calls dqds.
In case of failure it changes shifts, and tries again until output
is positive.

## Parameters
I0 : INTEGER [in]
> First index.

N0 : INTEGER [in,out]
> Last index.

Z : REAL array, dimension ( 4\*N0 ) [in,out]
> Z holds the qd array.

PP : INTEGER [in,out]
> PP=0 for ping, PP=1 for pong.
> PP=2 indicates that flipping was applied to the Z array
> and that the initial tests for deflation should not be
> performed.

DMIN : REAL [out]
> Minimum value of d.

SIGMA : REAL [out]
> Sum of shifts used in current segment.

DESIG : REAL [in,out]
> Lower order part of SIGMA

QMAX : REAL [in]
> Maximum value of q.

NFAIL : INTEGER [in,out]
> Increment NFAIL by 1 each time the shift was too big.

ITER : INTEGER [in,out]
> Increment ITER by 1 for each iteration.

NDIV : INTEGER [in,out]
> Increment NDIV by 1 for each division.

IEEE : LOGICAL [in]
> Flag for IEEE or non IEEE arithmetic (passed to SLASQ5).

TTYPE : INTEGER [in,out]
> Shift type.

DMIN1 : REAL [in,out]

DMIN2 : REAL [in,out]

DN : REAL [in,out]

DN1 : REAL [in,out]

DN2 : REAL [in,out]

G : REAL [in,out]

TAU : REAL [in,out]
> 
> These are passed as arguments in order to save their values
> between calls to SLASQ3.
