```fortran
subroutine dlaed8 (
        integer icompq,
        integer k,
        integer n,
        integer qsiz,
        double precision, dimension( * ) d,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        integer, dimension( * ) indxq,
        double precision rho,
        integer cutpnt,
        double precision, dimension( * ) z,
        double precision, dimension( * ) dlambda,
        double precision, dimension( ldq2, * ) q2,
        integer ldq2,
        double precision, dimension( * ) w,
        integer, dimension( * ) perm,
        integer givptr,
        integer, dimension( 2, * ) givcol,
        double precision, dimension( 2, * ) givnum,
        integer, dimension( * ) indxp,
        integer, dimension( * ) indx,
        integer info
)
```

DLAED8 merges the two sets of eigenvalues together into a single
sorted set.  Then it tries to deflate the size of the problem.
There are two ways in which deflation can occur:  when two or more
eigenvalues are close together or if there is a tiny element in the
Z vector.  For each such occurrence the order of the related secular
equation problem is reduced by one.

## Parameters
ICOMPQ : INTEGER [in]
> = 0:  Compute eigenvalues only.
> = 1:  Compute eigenvectors of original dense symmetric matrix
> also.  On entry, Q contains the orthogonal matrix used
> to reduce the original matrix to tridiagonal form.

K : INTEGER [out]
> The number of non-deflated eigenvalues, and the order of the
> related secular equation.

N : INTEGER [in]
> The dimension of the symmetric tridiagonal matrix.  N >= 0.

QSIZ : INTEGER [in]
> The dimension of the orthogonal matrix used to reduce
> the full matrix to tridiagonal form.  QSIZ >= N if ICOMPQ = 1.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the eigenvalues of the two submatrices to be
> combined.  On exit, the trailing (N-K) updated eigenvalues
> (those which were deflated) sorted into increasing order.

Q : DOUBLE PRECISION array, dimension (LDQ,N) [in,out]
> If ICOMPQ = 0, Q is not referenced.  Otherwise,
> on entry, Q contains the eigenvectors of the partially solved
> system which has been previously updated in matrix
> multiplies with other partially solved eigensystems.
> On exit, Q contains the trailing (N-K) updated eigenvectors
> (those which were deflated) in its last N-K columns.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= max(1,N).

INDXQ : INTEGER array, dimension (N) [in]
> The permutation which separately sorts the two sub-problems
> in D into ascending order.  Note that elements in the second
> half of this permutation must first have CUTPNT added to
> their values in order to be accurate.

RHO : DOUBLE PRECISION [in,out]
> On entry, the off-diagonal element associated with the rank-1
> cut which originally split the two submatrices which are now
> being recombined.
> On exit, RHO has been modified to the value required by
> DLAED3.

CUTPNT : INTEGER [in]
> The location of the last eigenvalue in the leading
> sub-matrix.  min(1,N) <= CUTPNT <= N.

Z : DOUBLE PRECISION array, dimension (N) [in]
> On entry, Z contains the updating vector (the last row of
> the first sub-eigenvector matrix and the first row of the
> second sub-eigenvector matrix).
> On exit, the contents of Z are destroyed by the updating
> process.

DLAMBDA : DOUBLE PRECISION array, dimension (N) [out]
> A copy of the first K eigenvalues which will be used by
> DLAED3 to form the secular equation.

Q2 : DOUBLE PRECISION array, dimension (LDQ2,N) [out]
> If ICOMPQ = 0, Q2 is not referenced.  Otherwise,
> a copy of the first K eigenvectors which will be used by
> DLAED7 in a matrix multiply (DGEMM) to update the new
> eigenvectors.

LDQ2 : INTEGER [in]
> The leading dimension of the array Q2.  LDQ2 >= max(1,N).

W : DOUBLE PRECISION array, dimension (N) [out]
> The first k values of the final deflation-altered z-vector and
> will be passed to DLAED3.

PERM : INTEGER array, dimension (N) [out]
> The permutations (from deflation and sorting) to be applied
> to each eigenblock.

GIVPTR : INTEGER [out]
> The number of Givens rotations which took place in this
> subproblem.

GIVCOL : INTEGER array, dimension (2, N) [out]
> Each pair of numbers indicates a pair of columns to take place
> in a Givens rotation.

GIVNUM : DOUBLE PRECISION array, dimension (2, N) [out]
> Each number indicates the S value to be used in the
> corresponding Givens rotation.

INDXP : INTEGER array, dimension (N) [out]
> The permutation used to place deflated values of D at the end
> of the array.  INDXP(1:K) points to the nondeflated D-values
> and INDXP(K+1:N) points to the deflated eigenvalues.

INDX : INTEGER array, dimension (N) [out]
> The permutation used to sort the contents of D into ascending
> order.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
