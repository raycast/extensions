```fortran
subroutine dlarra (
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        double precision, dimension( * ) e2,
        double precision spltol,
        double precision tnrm,
        integer nsplit,
        integer, dimension( * ) isplit,
        integer info
)
```

Compute the splitting points with threshold SPLTOL.
DLARRA sets any  off-diagonal elements to zero.

## Parameters
N : INTEGER [in]
> The order of the matrix. N > 0.

D : DOUBLE PRECISION array, dimension (N) [in]
> On entry, the N diagonal elements of the tridiagonal
> matrix T.

E : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the first (N-1) entries contain the subdiagonal
> elements of the tridiagonal matrix T; E(N) need not be set.
> On exit, the entries E( ISPLIT( I ) ), 1 <= I <= NSPLIT,
> are set to zero, the other entries of E are untouched.

E2 : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the first (N-1) entries contain the SQUARES of the
> subdiagonal elements of the tridiagonal matrix T;
> E2(N) need not be set.
> On exit, the entries E2( ISPLIT( I ) ),
> 1 <= I <= NSPLIT, have been set to zero

SPLTOL : DOUBLE PRECISION [in]
> The threshold for splitting. Two criteria can be used:
> SPLTOL<0 : criterion based on absolute off-diagonal value
> SPLTOL>0 : criterion that preserves relative accuracy

TNRM : DOUBLE PRECISION [in]
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
