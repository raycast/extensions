```fortran
subroutine dlarrf (
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) l,
        double precision, dimension( * ) ld,
        integer clstrt,
        integer clend,
        double precision, dimension( * ) w,
        double precision, dimension( * ) wgap,
        double precision, dimension( * ) werr,
        double precision spdiam,
        double precision clgapl,
        double precision clgapr,
        double precision pivmin,
        double precision sigma,
        double precision, dimension( * ) dplus,
        double precision, dimension( * ) lplus,
        double precision, dimension( * ) work,
        integer info
)
```

Given the initial representation L D L^T and its cluster of close
eigenvalues (in a relative measure), W( CLSTRT ), W( CLSTRT+1 ), ...
W( CLEND ), DLARRF finds a new relatively robust representation
L D L^T - SIGMA I = L(+) D(+) L(+)^T such that at least one of the
eigenvalues of L(+) D(+) L(+)^T is relatively isolated.

## Parameters
N : INTEGER [in]
> The order of the matrix (subblock, if the matrix split).

D : DOUBLE PRECISION array, dimension (N) [in]
> The N diagonal elements of the diagonal matrix D.

L : DOUBLE PRECISION array, dimension (N-1) [in]
> The (N-1) subdiagonal elements of the unit bidiagonal
> matrix L.

LD : DOUBLE PRECISION array, dimension (N-1) [in]
> The (N-1) elements L(i)\*D(i).

CLSTRT : INTEGER [in]
> The index of the first eigenvalue in the cluster.

CLEND : INTEGER [in]
> The index of the last eigenvalue in the cluster.

W : DOUBLE PRECISION array, dimension [in]
> dimension is >=  (CLEND-CLSTRT+1)
> The eigenvalue APPROXIMATIONS of L D L^T in ascending order.
> W( CLSTRT ) through W( CLEND ) form the cluster of relatively
> close eigenalues.

WGAP : DOUBLE PRECISION array, dimension [in,out]
> dimension is >=  (CLEND-CLSTRT+1)
> The separation from the right neighbor eigenvalue in W.

WERR : DOUBLE PRECISION array, dimension [in]
> dimension is  >=  (CLEND-CLSTRT+1)
> WERR contain the semiwidth of the uncertainty
> interval of the corresponding eigenvalue APPROXIMATION in W

SPDIAM : DOUBLE PRECISION [in]
> estimate of the spectral diameter obtained from the
> Gerschgorin intervals

CLGAPL : DOUBLE PRECISION [in]

CLGAPR : DOUBLE PRECISION [in]
> absolute gap on each end of the cluster.
> Set by the calling routine to protect against shifts too close
> to eigenvalues outside the cluster.

PIVMIN : DOUBLE PRECISION [in]
> The minimum pivot allowed in the Sturm sequence.

SIGMA : DOUBLE PRECISION [out]
> The shift used to form L(+) D(+) L(+)^T.

DPLUS : DOUBLE PRECISION array, dimension (N) [out]
> The N diagonal elements of the diagonal matrix D(+).

LPLUS : DOUBLE PRECISION array, dimension (N-1) [out]
> The first (N-1) elements of LPLUS contain the subdiagonal
> elements of the unit bidiagonal matrix L(+).

WORK : DOUBLE PRECISION array, dimension (2\*N) [out]
> Workspace.

INFO : INTEGER [out]
> Signals processing OK (=0) or failure (=1)
