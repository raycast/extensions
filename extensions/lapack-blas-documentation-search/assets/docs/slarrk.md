```fortran
subroutine slarrk (
        integer n,
        integer iw,
        real gl,
        real gu,
        real, dimension( * ) d,
        real, dimension( * ) e2,
        real pivmin,
        real reltol,
        real w,
        real werr,
        integer info
)
```

SLARRK computes one eigenvalue of a symmetric tridiagonal
matrix T to suitable accuracy. This is an auxiliary code to be
called from SSTEMR.

To avoid overflow, the matrix must be scaled so that its
largest element is no greater than overflow\*\*(1/2) \* underflow\*\*(1/4) in absolute value, and for greatest
accuracy, it should not be much smaller than that.

See W. Kahan , Report CS41, Computer Science Dept., Stanford
University, July 21, 1966.

## Parameters
N : INTEGER [in]
> The order of the tridiagonal matrix T.  N >= 0.

IW : INTEGER [in]
> The index of the eigenvalues to be returned.

GL : REAL [in]

GU : REAL [in]
> An upper and a lower bound on the eigenvalue.

D : REAL array, dimension (N) [in]
> The n diagonal elements of the tridiagonal matrix T.

E2 : REAL array, dimension (N-1) [in]
> The (n-1) squared off-diagonal elements of the tridiagonal matrix T.

PIVMIN : REAL [in]
> The minimum pivot allowed in the Sturm sequence for T.

RELTOL : REAL [in]
> The minimum relative width of an interval.  When an interval
> is narrower than RELTOL times the larger (in
> magnitude) endpoint, then it is considered to be
> sufficiently small, i.e., converged.  Note: this should
> always be at least radix\*machine epsilon.

W : REAL [out]

WERR : REAL [out]
> The error bound on the corresponding eigenvalue approximation
> in W.

INFO : INTEGER [out]
> = 0:       Eigenvalue converged
> = -1:      Eigenvalue did NOT converge
