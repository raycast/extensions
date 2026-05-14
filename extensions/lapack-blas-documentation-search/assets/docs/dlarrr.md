```fortran
subroutine dlarrr (
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        integer info
)
```

Perform tests to decide whether the symmetric tridiagonal matrix T
warrants expensive computations which guarantee high relative accuracy
in the eigenvalues.

## Parameters
N : INTEGER [in]
> The order of the matrix. N > 0.

D : DOUBLE PRECISION array, dimension (N) [in]
> The N diagonal elements of the tridiagonal matrix T.

E : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the first (N-1) entries contain the subdiagonal
> elements of the tridiagonal matrix T; E(N) is set to ZERO.

INFO : INTEGER [out]
> INFO = 0(default) : the matrix warrants computations preserving
> relative accuracy.
> INFO = 1          : the matrix warrants computations guaranteeing
> only absolute accuracy.
