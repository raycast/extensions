```fortran
subroutine dlasq3 (
        integer i0,
        integer n0,
        double precision, dimension( * ) z,
        integer pp,
        double precision dmin,
        double precision sigma,
        double precision desig,
        double precision qmax,
        integer nfail,
        integer iter,
        integer ndiv,
        logical ieee,
        integer ttype,
        double precision dmin1,
        double precision dmin2,
        double precision dn,
        double precision dn1,
        double precision dn2,
        double precision g,
        double precision tau
)
```

DLASQ3 checks for deflation, computes a shift (TAU) and calls dqds.
In case of failure it changes shifts, and tries again until output
is positive.

## Parameters
I0 : INTEGER [in]
> First index.

N0 : INTEGER [in,out]
> Last index.

Z : DOUBLE PRECISION array, dimension ( 4\*N0 ) [in,out]
> Z holds the qd array.

PP : INTEGER [in,out]
> PP=0 for ping, PP=1 for pong.
> PP=2 indicates that flipping was applied to the Z array
> and that the initial tests for deflation should not be
> performed.

DMIN : DOUBLE PRECISION [out]
> Minimum value of d.

SIGMA : DOUBLE PRECISION [out]
> Sum of shifts used in current segment.

DESIG : DOUBLE PRECISION [in,out]
> Lower order part of SIGMA

QMAX : DOUBLE PRECISION [in]
> Maximum value of q.

NFAIL : INTEGER [in,out]
> Increment NFAIL by 1 each time the shift was too big.

ITER : INTEGER [in,out]
> Increment ITER by 1 for each iteration.

NDIV : INTEGER [in,out]
> Increment NDIV by 1 for each division.

IEEE : LOGICAL [in]
> Flag for IEEE or non IEEE arithmetic (passed to DLASQ5).

TTYPE : INTEGER [in,out]
> Shift type.

DMIN1 : DOUBLE PRECISION [in,out]

DMIN2 : DOUBLE PRECISION [in,out]

DN : DOUBLE PRECISION [in,out]

DN1 : DOUBLE PRECISION [in,out]

DN2 : DOUBLE PRECISION [in,out]

G : DOUBLE PRECISION [in,out]

TAU : DOUBLE PRECISION [in,out]
> 
> These are passed as arguments in order to save their values
> between calls to DLASQ3.
