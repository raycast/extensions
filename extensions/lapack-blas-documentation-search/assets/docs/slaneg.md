```fortran
integer function slaneg (
        integer n,
        real, dimension( * ) d,
        real, dimension( * ) lld,
        real sigma,
        real pivmin,
        integer r
)
```

SLANEG computes the Sturm count, the number of negative pivots
encountered while factoring tridiagonal T - sigma I = L D L^T.
This implementation works directly on the factors without forming
the tridiagonal matrix T.  The Sturm count is also the number of
eigenvalues of T less than sigma.

This routine is called from SLARRB.

The current routine does not use the PIVMIN parameter but rather
requires IEEE-754 propagation of Infinities and NaNs.  This
routine also has no input range restrictions but does require
default exception handling such that x/0 produces Inf when x is
non-zero, and Inf/Inf produces NaN.  For more information, see:

Marques, Riedy, and Voemel,  SIAM Journal on
Scientific Computing, v28, n5, 2006.  DOI 10.1137/050641624
(Tech report version in LAWN 172 with the same title.)

## Parameters
N : INTEGER [in]
> The order of the matrix.

D : REAL array, dimension (N) [in]
> The N diagonal elements of the diagonal matrix D.

LLD : REAL array, dimension (N-1) [in]
> The (N-1) elements L(i)\*L(i)\*D(i).

SIGMA : REAL [in]
> Shift amount in T - sigma I = L D L^T.

PIVMIN : REAL [in]
> The minimum pivot in the Sturm sequence.  May be used
> when zero pivots are encountered on non-IEEE-754
> architectures.

R : INTEGER [in]
> The twist index for the twisted factorization that is used
> for the negcount.
