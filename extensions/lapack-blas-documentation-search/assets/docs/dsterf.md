```fortran
subroutine dsterf (
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        integer info
)
```

DSTERF computes all eigenvalues of a symmetric tridiagonal matrix
using the Pal-Walker-Kahan variant of the QL or QR algorithm.

## Parameters
N : INTEGER [in]
> The order of the matrix.  N >= 0.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the n diagonal elements of the tridiagonal matrix.
> On exit, if INFO = 0, the eigenvalues in ascending order.

E : DOUBLE PRECISION array, dimension (N-1) [in,out]
> On entry, the (n-1) subdiagonal elements of the tridiagonal
> matrix.
> On exit, E has been destroyed.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  the algorithm failed to find all of the eigenvalues in
> a total of 30\*N iterations; if INFO = i, then i
> elements of E have not converged to zero.
