```fortran
subroutine dpttrf (
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e,
        integer info
)
```

DPTTRF computes the L\*D\*L\*\*T factorization of a real symmetric
positive definite tridiagonal matrix A.  The factorization may also
be regarded as having the form A = U\*\*T\*D\*U.

## Parameters
N : INTEGER [in]
> The order of the matrix A.  N >= 0.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the n diagonal elements of the tridiagonal matrix
> A.  On exit, the n diagonal elements of the diagonal matrix
> D from the L\*D\*L\*\*T factorization of A.

E : DOUBLE PRECISION array, dimension (N-1) [in,out]
> On entry, the (n-1) subdiagonal elements of the tridiagonal
> matrix A.  On exit, the (n-1) subdiagonal elements of the
> unit bidiagonal factor L from the L\*D\*L\*\*T factorization of A.
> E can also be regarded as the superdiagonal of the unit
> bidiagonal factor U from the U\*\*T\*D\*U factorization of A.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -k, the k-th argument had an illegal value
> > 0: if INFO = k, the leading principal minor of order k
> is not positive; if k < N, the factorization could not
> be completed, while if k = N, the factorization was
> completed, but D(N) <= 0.
