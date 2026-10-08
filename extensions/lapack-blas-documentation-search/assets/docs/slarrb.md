```fortran
subroutine slarrb (
        integer n,
        real, dimension( * ) d,
        real, dimension( * ) lld,
        integer ifirst,
        integer ilast,
        real rtol1,
        real rtol2,
        integer offset,
        real, dimension( * ) w,
        real, dimension( * ) wgap,
        real, dimension( * ) werr,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        real pivmin,
        real spdiam,
        integer twist,
        integer info
)
```

Given the relatively robust representation(RRR) L D L^T, SLARRB
does  bisection to refine the eigenvalues of L D L^T,
W( IFIRST-OFFSET ) through W( ILAST-OFFSET ), to more accuracy. Initial
guesses for these eigenvalues are input in W, the corresponding estimate
of the error in these guesses and their gaps are input in WERR
and WGAP, respectively. During bisection, intervals
[left, right] are maintained by storing their mid-points and
semi-widths in the arrays W and WERR respectively.

## Parameters
N : INTEGER [in]
> The order of the matrix.

D : REAL array, dimension (N) [in]
> The N diagonal elements of the diagonal matrix D.

LLD : REAL array, dimension (N-1) [in]
> The (N-1) elements L(i)\*L(i)\*D(i).

IFIRST : INTEGER [in]
> The index of the first eigenvalue to be computed.

ILAST : INTEGER [in]
> The index of the last eigenvalue to be computed.

RTOL1 : REAL [in]

RTOL2 : REAL [in]
> Tolerance for the convergence of the bisection intervals.
> An interval [LEFT,RIGHT] has converged if
> RIGHT-LEFT < MAX( RTOL1\*GAP, RTOL2\*MAX(|LEFT|,|RIGHT|) )
> where GAP is the (estimated) distance to the nearest
> eigenvalue.

OFFSET : INTEGER [in]
> Offset for the arrays W, WGAP and WERR, i.e., the IFIRST-OFFSET
> through ILAST-OFFSET elements of these arrays are to be used.

W : REAL array, dimension (N) [in,out]
> On input, W( IFIRST-OFFSET ) through W( ILAST-OFFSET ) are
> estimates of the eigenvalues of L D L^T indexed IFIRST through
> ILAST.
> On output, these estimates are refined.

WGAP : REAL array, dimension (N-1) [in,out]
> On input, the (estimated) gaps between consecutive
> eigenvalues of L D L^T, i.e., WGAP(I-OFFSET) is the gap between
> eigenvalues I and I+1. Note that if IFIRST = ILAST
> then WGAP(IFIRST-OFFSET) must be set to ZERO.
> On output, these gaps are refined.

WERR : REAL array, dimension (N) [in,out]
> On input, WERR( IFIRST-OFFSET ) through WERR( ILAST-OFFSET ) are
> the errors in the estimates of the corresponding elements in W.
> On output, these errors are refined.

WORK : REAL array, dimension (2\*N) [out]
> Workspace.

IWORK : INTEGER array, dimension (2\*N) [out]
> Workspace.

PIVMIN : REAL [in]
> The minimum pivot in the Sturm sequence.

SPDIAM : REAL [in]
> The spectral diameter of the matrix.

TWIST : INTEGER [in]
> The twist index for the twisted factorization that is used
> for the negcount.
> TWIST = N: Compute negcount from L D L^T - LAMBDA I = L+ D+ L+^T
> TWIST = 1: Compute negcount from L D L^T - LAMBDA I = U- D- U-^T
> TWIST = R: Compute negcount from L D L^T - LAMBDA I = N(r) D(r) N(r)

INFO : INTEGER [out]
> Error flag.
