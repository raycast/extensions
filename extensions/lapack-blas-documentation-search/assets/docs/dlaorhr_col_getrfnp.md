```fortran
subroutine dlaorhr_col_getrfnp (
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) d,
        integer info
)
```

DLAORHR_COL_GETRFNP computes the modified LU factorization without
pivoting of a real general M-by-N matrix A. The factorization has
the form:

A - S = L \* U,

where:
S is a m-by-n diagonal sign matrix with the diagonal D, so that
D(i) = S(i,i), 1 <= i <= min(M,N). The diagonal D is constructed
as D(i)=-SIGN(A(i,i)), where A(i,i) is the value after performing
i-1 steps of Gaussian elimination. This means that the diagonal
element at each step of  Gaussian elimination is
at least one in absolute value (so that division-by-zero not
not possible during the division by the diagonal element);

L is a M-by-N lower triangular matrix with unit diagonal elements
(lower trapezoidal if M > N);

and U is a M-by-N upper triangular matrix
(upper trapezoidal if M < N).

This routine is an auxiliary routine used in the Householder
reconstruction routine DORHR_COL. In DORHR_COL, this routine is
applied to an M-by-N matrix A with orthonormal columns, where each
element is bounded by one in absolute value. With the choice of
the matrix S above, one can show that the diagonal element at each
step of Gaussian elimination is the largest (in absolute value) in
the column on or below the diagonal, so that no pivoting is required
for numerical stability [1].

For more details on the Householder reconstruction algorithm,
including the modified LU factorization, see [1].

This is the blocked right-looking version of the algorithm,
calling Level 3 BLAS to update the submatrix. To factorize a block,
this routine calls the recursive routine DLAORHR_COL_GETRFNP2.

[1] ,
G. Ballard, J. Demmel, L. Grigori, M. Jacquelin, H.D. Nguyen,
E. Solomonik, J. Parallel Distrib. Comput.,
vol. 85, pp. 3-31, 2015.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix to be factored.
> On exit, the factors L and U from the factorization
> A-S=L\*U; the unit diagonal elements of L are not stored.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

D : DOUBLE PRECISION array, dimension min(M,N) [out]
> The diagonal elements of the diagonal M-by-N sign matrix S,
> D(i) = S(i,i), where 1 <= i <= min(M,N). The elements can
> be only plus or minus one.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
