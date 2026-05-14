```fortran
subroutine zlaed8 (
        integer k,
        integer n,
        integer qsiz,
        complex*16, dimension( ldq, * ) q,
        integer ldq,
        double precision, dimension( * ) d,
        double precision rho,
        integer cutpnt,
        double precision, dimension( * ) z,
        double precision, dimension( * ) dlambda,
        complex*16, dimension( ldq2, * ) q2,
        integer ldq2,
        double precision, dimension( * ) w,
        integer, dimension( * ) indxp,
        integer, dimension( * ) indx,
        integer, dimension( * ) indxq,
        integer, dimension( * ) perm,
        integer givptr,
        integer, dimension( 2, * ) givcol,
        double precision, dimension( 2, * ) givnum,
        integer info
)
```

ZLAED8 merges the two sets of eigenvalues together into a single
sorted set.  Then it tries to deflate the size of the problem.
There are two ways in which deflation can occur:  when two or more
eigenvalues are close together or if there is a tiny element in the
Z vector.  For each such occurrence the order of the related secular
equation problem is reduced by one.

## Parameters
K : INTEGER [out]
> Contains the number of non-deflated eigenvalues.
> This is the order of the related secular equation.

N : INTEGER [in]
> The dimension of the symmetric tridiagonal matrix.  N >= 0.

QSIZ : INTEGER [in]
> The dimension of the unitary matrix used to reduce
> the dense or band matrix to tridiagonal form.
> QSIZ >= N if ICOMPQ = 1.

Q : COMPLEX\*16 array, dimension (LDQ,N) [in,out]
> On entry, Q contains the eigenvectors of the partially solved
> system which has been previously updated in matrix
> multiplies with other partially solved eigensystems.
> On exit, Q contains the trailing (N-K) updated eigenvectors
> (those which were deflated) in its last N-K columns.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= max( 1, N ).

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, D contains the eigenvalues of the two submatrices to
> be combined.  On exit, D contains the trailing (N-K) updated
> eigenvalues (those which were deflated) sorted into increasing
> order.

RHO : DOUBLE PRECISION [in,out]
> Contains the off diagonal element associated with the rank-1
> cut which originally split the two submatrices which are now
> being recombined. RHO is modified during the computation to
> the value required by DLAED3.

CUTPNT : INTEGER [in]
> Contains the location of the last eigenvalue in the leading
> sub-matrix.  MIN(1,N) <= CUTPNT <= N.

Z : DOUBLE PRECISION array, dimension (N) [in]
> On input this vector contains the updating vector (the last
> row of the first sub-eigenvector matrix and the first row of
> the second sub-eigenvector matrix).  The contents of Z are
> destroyed during the updating process.

DLAMBDA : DOUBLE PRECISION array, dimension (N) [out]
> Contains a copy of the first K eigenvalues which will be used
> by DLAED3 to form the secular equation.

Q2 : COMPLEX\*16 array, dimension (LDQ2,N) [out]
> If ICOMPQ = 0, Q2 is not referenced.  Otherwise,
> Contains a copy of the first K eigenvectors which will be used
> by DLAED7 in a matrix multiply (DGEMM) to update the new
> eigenvectors.

LDQ2 : INTEGER [in]
> The leading dimension of the array Q2.  LDQ2 >= max( 1, N ).

W : DOUBLE PRECISION array, dimension (N) [out]
> This will hold the first k values of the final
> deflation-altered z-vector and will be passed to DLAED3.

INDXP : INTEGER array, dimension (N) [out]
> This will contain the permutation used to place deflated
> values of D at the end of the array. On output INDXP(1:K)
> points to the nondeflated D-values and INDXP(K+1:N)
> points to the deflated eigenvalues.

INDX : INTEGER array, dimension (N) [out]
> This will contain the permutation used to sort the contents of
> D into ascending order.

INDXQ : INTEGER array, dimension (N) [in]
> This contains the permutation which separately sorts the two
> sub-problems in D into ascending order.  Note that elements in
> the second half of this permutation must first have CUTPNT
> added to their values in order to be accurate.

PERM : INTEGER array, dimension (N) [out]
> Contains the permutations (from deflation and sorting) to be
> applied to each eigenblock.

GIVPTR : INTEGER [out]
> Contains the number of Givens rotations which took place in
> this subproblem.

GIVCOL : INTEGER array, dimension (2, N) [out]
> Each pair of numbers indicates a pair of columns to take place
> in a Givens rotation.

GIVNUM : DOUBLE PRECISION array, dimension (2, N) [out]
> Each number indicates the S value to be used in the
> corresponding Givens rotation.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
