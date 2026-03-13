```fortran
recursive subroutine zlaunhr_col_getrfnp2 (
        integer m,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( * ) d,
        integer info
)
```

ZLAUNHR_COL_GETRFNP2 computes the modified LU factorization without
pivoting of a complex general M-by-N matrix A. The factorization has
the form:

A - S = L \* U,

where:
S is a m-by-n diagonal sign matrix with the diagonal D, so that
D(i) = S(i,i), 1 <= i <= min(M,N). The diagonal D is constructed
as D(i)=-SIGN(A(i,i)), where A(i,i) is the value after performing
i-1 steps of Gaussian elimination. This means that the diagonal
element at each step of  Gaussian elimination is at
least one in absolute value (so that division-by-zero not
possible during the division by the diagonal element);

L is a M-by-N lower triangular matrix with unit diagonal elements
(lower trapezoidal if M > N);

and U is a M-by-N upper triangular matrix
(upper trapezoidal if M < N).

This routine is an auxiliary routine used in the Householder
reconstruction routine ZUNHR_COL. In ZUNHR_COL, this routine is
applied to an M-by-N matrix A with orthonormal columns, where each
element is bounded by one in absolute value. With the choice of
the matrix S above, one can show that the diagonal element at each
step of Gaussian elimination is the largest (in absolute value) in
the column on or below the diagonal, so that no pivoting is required
for numerical stability [1].

For more details on the Householder reconstruction algorithm,
including the modified LU factorization, see [1].

This is the recursive version of the LU factorization algorithm.
Denote A - S by B. The algorithm divides the matrix B into four
submatrices:

[  B11 | B12  ]  where B11 is n1 by n1,
B = [ -----|----- ]        B21 is (m-n1) by n1,
[  B21 | B22  ]        B12 is n1 by n2,
B22 is (m-n1) by n2,
with n1 = min(m,n)/2, n2 = n-n1.


The subroutine calls itself to factor B11, solves for B21,
solves for B12, updates B22, then calls itself to factor B22.

For more details on the recursive LU algorithm, see [2].

ZLAUNHR_COL_GETRFNP2 is called to factorize a block by the blocked
routine ZLAUNHR_COL_GETRFNP, which uses blocked code calling
Level 3 BLAS to update the submatrix. However, ZLAUNHR_COL_GETRFNP2
is self-sufficient and can be used without ZLAUNHR_COL_GETRFNP.

[1] ,
G. Ballard, J. Demmel, L. Grigori, M. Jacquelin, H.D. Nguyen,
E. Solomonik, J. Parallel Distrib. Comput.,
vol. 85, pp. 3-31, 2015.

[2] , F. Gustavson, IBM J. of Res. and Dev.,
vol. 41, no. 6, pp. 737-755, 1997.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix to be factored.
> On exit, the factors L and U from the factorization
> A-S=L\*U; the unit diagonal elements of L are not stored.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

D : COMPLEX\*16 array, dimension min(M,N) [out]
> The diagonal elements of the diagonal M-by-N sign matrix S,
> D(i) = S(i,i), where 1 <= i <= min(M,N). The elements can be
> only ( +1.0, 0.0 ) or (-1.0, 0.0 ).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
