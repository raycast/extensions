```fortran
subroutine dlarrc (
        character jobt,
        integer n,
        double precision vl,
        double precision vu,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        double precision pivmin,
        integer eigcnt,
        integer lcnt,
        integer rcnt,
        integer info
)
```

Find the number of eigenvalues of the symmetric tridiagonal matrix T
that are in the interval (VL,VU] if JOBT = 'T', and of L D L^T
if JOBT = 'L'.

## Parameters
JOBT : CHARACTER\*1 [in]
> = 'T':  Compute Sturm count for matrix T.
> = 'L':  Compute Sturm count for matrix L D L^T.

N : INTEGER [in]
> The order of the matrix. N > 0.

VL : DOUBLE PRECISION [in]
> The lower bound for the eigenvalues.

VU : DOUBLE PRECISION [in]
> The upper bound for the eigenvalues.

D : DOUBLE PRECISION array, dimension (N) [in]
> JOBT = 'T': The N diagonal elements of the tridiagonal matrix T.
> JOBT = 'L': The N diagonal elements of the diagonal matrix D.

E : DOUBLE PRECISION array, dimension (N) [in]
> JOBT = 'T': The N-1 offdiagonal elements of the matrix T.
> JOBT = 'L': The N-1 offdiagonal elements of the matrix L.

PIVMIN : DOUBLE PRECISION [in]
> The minimum pivot in the Sturm sequence for T.

EIGCNT : INTEGER [out]
> The number of eigenvalues of the symmetric tridiagonal matrix T
> that are in the interval (VL,VU]

LCNT : INTEGER [out]

RCNT : INTEGER [out]
> The left and right negcounts of the interval.

INFO : INTEGER [out]
