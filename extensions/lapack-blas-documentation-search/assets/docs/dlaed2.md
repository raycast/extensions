```fortran
subroutine dlaed2 (
        integer k,
        integer n,
        integer n1,
        double precision, dimension( * ) d,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        integer, dimension( * ) indxq,
        double precision rho,
        double precision, dimension( * ) z,
        double precision, dimension( * ) dlambda,
        double precision, dimension( * ) w,
        double precision, dimension( * ) q2,
        integer, dimension( * ) indx,
        integer, dimension( * ) indxc,
        integer, dimension( * ) indxp,
        integer, dimension( * ) coltyp,
        integer info
)
```

DLAED2 merges the two sets of eigenvalues together into a single
sorted set.  Then it tries to deflate the size of the problem.
There are two ways in which deflation can occur:  when two or more
eigenvalues are close together or if there is a tiny entry in the
Z vector.  For each such occurrence the order of the related secular
equation problem is reduced by one.

## Parameters
K : INTEGER [out]
> The number of non-deflated eigenvalues, and the order of the
> related secular equation. 0 <= K <=N.

N : INTEGER [in]
> The dimension of the symmetric tridiagonal matrix.  N >= 0.

N1 : INTEGER [in]
> The location of the last eigenvalue in the leading sub-matrix.
> min(1,N) <= N1 <= N/2.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, D contains the eigenvalues of the two submatrices to
> be combined.
> On exit, D contains the trailing (N-K) updated eigenvalues
> (those which were deflated) sorted into increasing order.

Q : DOUBLE PRECISION array, dimension (LDQ, N) [in,out]
> On entry, Q contains the eigenvectors of two submatrices in
> the two square blocks with corners at (1,1), (N1,N1)
> and (N1+1, N1+1), (N,N).
> On exit, Q contains the trailing (N-K) updated eigenvectors
> (those which were deflated) in its last N-K columns.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= max(1,N).

INDXQ : INTEGER array, dimension (N) [in,out]
> The permutation which separately sorts the two sub-problems
> in D into ascending order.  Note that elements in the second
> half of this permutation must first have N1 added to their
> values. Destroyed on exit.

RHO : DOUBLE PRECISION [in,out]
> On entry, the off-diagonal element associated with the rank-1
> cut which originally split the two submatrices which are now
> being recombined.
> On exit, RHO has been modified to the value required by
> DLAED3.

Z : DOUBLE PRECISION array, dimension (N) [in]
> On entry, Z contains the updating vector (the last
> row of the first sub-eigenvector matrix and the first row of
> the second sub-eigenvector matrix).
> On exit, the contents of Z have been destroyed by the updating
> process.

DLAMBDA : DOUBLE PRECISION array, dimension (N) [out]
> A copy of the first K eigenvalues which will be used by
> DLAED3 to form the secular equation.

W : DOUBLE PRECISION array, dimension (N) [out]
> The first k values of the final deflation-altered z-vector
> which will be passed to DLAED3.

Q2 : DOUBLE PRECISION array, dimension (N1\*\*2+(N-N1)\*\*2) [out]
> A copy of the first K eigenvectors which will be used by
> DLAED3 in a matrix multiply (DGEMM) to solve for the new
> eigenvectors.

INDX : INTEGER array, dimension (N) [out]
> The permutation used to sort the contents of DLAMBDA into
> ascending order.

INDXC : INTEGER array, dimension (N) [out]
> The permutation used to arrange the columns of the deflated
> Q matrix into three groups:  the first group contains non-zero
> elements only at and above N1, the second contains
> non-zero elements only below N1, and the third is dense.

INDXP : INTEGER array, dimension (N) [out]
> The permutation used to place deflated values of D at the end
> of the array.  INDXP(1:K) points to the nondeflated D-values
> and INDXP(K+1:N) points to the deflated eigenvalues.

COLTYP : INTEGER array, dimension (N) [out]
> During execution, a label which will indicate which of the
> following types a column in the Q2 matrix is:
> 1 : non-zero in the upper half only;
> 2 : dense;
> 3 : non-zero in the lower half only;
> 4 : deflated.
> On exit, COLTYP(i) is the number of columns of type i,
> for i=1 to 4 only.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
