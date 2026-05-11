```fortran
subroutine dlarrj (
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e2,
        integer ifirst,
        integer ilast,
        double precision rtol,
        integer offset,
        double precision, dimension( * ) w,
        double precision, dimension( * ) werr,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork,
        double precision pivmin,
        double precision spdiam,
        integer info
)
```

Given the initial eigenvalue approximations of T, DLARRJ
does  bisection to refine the eigenvalues of T,
W( IFIRST-OFFSET ) through W( ILAST-OFFSET ), to more accuracy. Initial
guesses for these eigenvalues are input in W, the corresponding estimate
of the error in these guesses in WERR. During bisection, intervals
[left, right] are maintained by storing their mid-points and
semi-widths in the arrays W and WERR respectively.

## Parameters
N : INTEGER [in]
> The order of the matrix.

D : DOUBLE PRECISION array, dimension (N) [in]
> The N diagonal elements of T.

E2 : DOUBLE PRECISION array, dimension (N-1) [in]
> The Squares of the (N-1) subdiagonal elements of T.

IFIRST : INTEGER [in]
> The index of the first eigenvalue to be computed.

ILAST : INTEGER [in]
> The index of the last eigenvalue to be computed.

RTOL : DOUBLE PRECISION [in]
> Tolerance for the convergence of the bisection intervals.
> An interval [LEFT,RIGHT] has converged if
> RIGHT-LEFT < RTOL\*MAX(|LEFT|,|RIGHT|).

OFFSET : INTEGER [in]
> Offset for the arrays W and WERR, i.e., the IFIRST-OFFSET
> through ILAST-OFFSET elements of these arrays are to be used.

W : DOUBLE PRECISION array, dimension (N) [in,out]
> On input, W( IFIRST-OFFSET ) through W( ILAST-OFFSET ) are
> estimates of the eigenvalues of L D L^T indexed IFIRST through
> ILAST.
> On output, these estimates are refined.

WERR : DOUBLE PRECISION array, dimension (N) [in,out]
> On input, WERR( IFIRST-OFFSET ) through WERR( ILAST-OFFSET ) are
> the errors in the estimates of the corresponding elements in W.
> On output, these errors are refined.

WORK : DOUBLE PRECISION array, dimension (2\*N) [out]
> Workspace.

IWORK : INTEGER array, dimension (2\*N) [out]
> Workspace.

PIVMIN : DOUBLE PRECISION [in]
> The minimum pivot in the Sturm sequence for T.

SPDIAM : DOUBLE PRECISION [in]
> The spectral diameter of T.

INFO : INTEGER [out]
> Error flag.
