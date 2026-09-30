```fortran
subroutine dgttrf (
        integer n,
        double precision, dimension( * ) dl,
        double precision, dimension( * ) d,
        double precision, dimension( * ) du,
        double precision, dimension( * ) du2,
        integer, dimension( * ) ipiv,
        integer info
)
```

DGTTRF computes an LU factorization of a real tridiagonal matrix A
using elimination with partial pivoting and row interchanges.

The factorization has the form
A = L \* U
where L is a product of permutation and unit lower bidiagonal
matrices and U is upper triangular with nonzeros in only the main
diagonal and first two superdiagonals.

## Parameters
N : INTEGER [in]
> The order of the matrix A.

DL : DOUBLE PRECISION array, dimension (N-1) [in,out]
> On entry, DL must contain the (n-1) sub-diagonal elements of
> A.
> 
> On exit, DL is overwritten by the (n-1) multipliers that
> define the matrix L from the LU factorization of A.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, D must contain the diagonal elements of A.
> 
> On exit, D is overwritten by the n diagonal elements of the
> upper triangular matrix U from the LU factorization of A.

DU : DOUBLE PRECISION array, dimension (N-1) [in,out]
> On entry, DU must contain the (n-1) super-diagonal elements
> of A.
> 
> On exit, DU is overwritten by the (n-1) elements of the first
> super-diagonal of U.

DU2 : DOUBLE PRECISION array, dimension (N-2) [out]
> On exit, DU2 is overwritten by the (n-2) elements of the
> second super-diagonal of U.

IPIV : INTEGER array, dimension (N) [out]
> The pivot indices; for 1 <= i <= n, row i of the matrix was
> interchanged with row IPIV(i).  IPIV(i) will always be either
> i or i+1; IPIV(i) = i indicates a row interchange was not
> required.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -k, the k-th argument had an illegal value
> > 0:  if INFO = k, U(k,k) is exactly zero. The factorization
> has been completed, but the factor U is exactly
> singular, and division by zero will occur if it is used
> to solve a system of equations.
