```fortran
subroutine slarra (
        integer n,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( * ) e2,
        real spltol,
        real tnrm,
        integer nsplit,
        integer, dimension( * ) isplit,
        integer info
)
```

Compute the splitting points with threshold SPLTOL.
SLARRA sets any  off-diagonal elements to zero.

## Parameters
N : INTEGER [in]
> The order of the matrix. N > 0.

D : REAL array, dimension (N) [in]
> On entry, the N diagonal elements of the tridiagonal
> matrix T.

E : REAL array, dimension (N) [in,out]
> On entry, the first (N-1) entries contain the subdiagonal
> elements of the tridiagonal matrix T; E(N) need not be set.
> On exit, the entries E( ISPLIT( I ) ), 1 <= I <= NSPLIT,
> are set to zero, the other entries of E are untouched.

E2 : REAL array, dimension (N) [in,out]
> On entry, the first (N-1) entries contain the SQUARES of the
> subdiagonal elements of the tridiagonal matrix T;
> E2(N) need not be set.
> On exit, the entries E2( ISPLIT( I ) ),
> 1 <= I <= NSPLIT, have been set to zero

SPLTOL : REAL [in]
> The threshold for splitting. Two criteria can be used:
> SPLTOL<0 : criterion based on absolute off-diagonal value
> SPLTOL>0 : criterion that preserves relative accuracy

TNRM : REAL [in]
> The norm of the matrix.

NSPLIT : INTEGER [out]
> The number of blocks T splits into. 1 <= NSPLIT <= N.

ISPLIT : INTEGER array, dimension (N) [out]
> The splitting points, at which T breaks up into blocks.
> The first block consists of rows/columns 1 to ISPLIT(1),
> the second of rows/columns ISPLIT(1)+1 through ISPLIT(2),
> etc., and the NSPLIT-th consists of rows/columns
> ISPLIT(NSPLIT-1)+1 through ISPLIT(NSPLIT)=N.

INFO : INTEGER [out]
> = 0:  successful exit
