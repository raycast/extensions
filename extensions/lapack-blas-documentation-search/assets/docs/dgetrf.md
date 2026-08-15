```fortran
subroutine dgetrf (
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        integer info
)
```

DGETRF computes an LU factorization of a general M-by-N matrix A
using partial pivoting with row interchanges.

The factorization has the form
A = P \* L \* U
where P is a permutation matrix, L is lower triangular with unit
diagonal elements (lower trapezoidal if m > n), and U is upper
triangular (upper trapezoidal if m < n).

This is the right-looking Level 3 BLAS version of the algorithm.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix to be factored.
> On exit, the factors L and U from the factorization
> A = P\*L\*U; the unit diagonal elements of L are not stored.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

IPIV : INTEGER array, dimension (min(M,N)) [out]
> The pivot indices; for 1 <= i <= min(M,N), row i of the
> matrix was interchanged with row IPIV(i).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, U(i,i) is exactly zero. The factorization
> has been completed, but the factor U is exactly
> singular, and division by zero will occur if it is used
> to solve a system of equations.
