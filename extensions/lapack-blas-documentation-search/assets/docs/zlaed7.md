```fortran
subroutine zlaed7 (
        integer n,
        integer cutpnt,
        integer qsiz,
        integer tlvls,
        integer curlvl,
        integer curpbm,
        double precision, dimension( * ) d,
        complex*16, dimension( ldq, * ) q,
        integer ldq,
        double precision rho,
        integer, dimension( * ) indxq,
        double precision, dimension( * ) qstore,
        integer, dimension( * ) qptr,
        integer, dimension( * ) prmptr,
        integer, dimension( * ) perm,
        integer, dimension( * ) givptr,
        integer, dimension( 2, * ) givcol,
        double precision, dimension( 2, * ) givnum,
        complex*16, dimension( * ) work,
        double precision, dimension( * ) rwork,
        integer, dimension( * ) iwork,
        integer info
)
```

ZLAED7 computes the updated eigensystem of a diagonal
matrix after modification by a rank-one symmetric matrix. This
routine is used only for the eigenproblem which requires all
eigenvalues and optionally eigenvectors of a dense or banded
Hermitian matrix that has been reduced to tridiagonal form.

T = Q(in) ( D(in) + RHO \* Z\*Z\*\*H ) Q\*\*H(in) = Q(out) \* D(out) \* Q\*\*H(out)

where Z = Q\*\*Hu, u is a vector of length N with ones in the
CUTPNT and CUTPNT + 1 th elements and zeros elsewhere.

The eigenvectors of the original matrix are stored in Q, and the
eigenvalues are in D.  The algorithm consists of three stages:

The first stage consists of deflating the size of the problem
when there are multiple eigenvalues or if there is a zero in
the Z vector.  For each such occurrence the dimension of the
secular equation problem is reduced by one.  This stage is
performed by the routine DLAED2.

The second stage consists of calculating the updated
eigenvalues. This is done by finding the roots of the secular
equation via the routine DLAED4 (as called by SLAED3).
This routine also calculates the eigenvectors of the current
problem.

The final stage consists of computing the updated eigenvectors
directly using the updated eigenvalues.  The eigenvectors for
the current problem are multiplied with the eigenvectors from
the overall problem.

## Parameters
N : INTEGER [in]
> The dimension of the symmetric tridiagonal matrix.  N >= 0.

CUTPNT : INTEGER [in]
> Contains the location of the last eigenvalue in the leading
> sub-matrix.  min(1,N) <= CUTPNT <= N.

QSIZ : INTEGER [in]
> The dimension of the unitary matrix used to reduce
> the full matrix to tridiagonal form.  QSIZ >= N.

TLVLS : INTEGER [in]
> The total number of merging levels in the overall divide and
> conquer tree.

CURLVL : INTEGER [in]
> The current level in the overall merge routine,
> 0 <= curlvl <= tlvls.

CURPBM : INTEGER [in]
> The current problem in the current level in the overall
> merge routine (counting from upper left to lower right).

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the eigenvalues of the rank-1-perturbed matrix.
> On exit, the eigenvalues of the repaired matrix.

Q : COMPLEX\*16 array, dimension (LDQ,N) [in,out]
> On entry, the eigenvectors of the rank-1-perturbed matrix.
> On exit, the eigenvectors of the repaired tridiagonal matrix.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= max(1,N).

RHO : DOUBLE PRECISION [in]
> Contains the subdiagonal element used to create the rank-1
> modification.

INDXQ : INTEGER array, dimension (N) [out]
> This contains the permutation which will reintegrate the
> subproblem just solved back into sorted order,
> ie. D( INDXQ( I = 1, N ) ) will be in ascending order.

IWORK : INTEGER array, dimension (4\*N) [out]

RWORK : DOUBLE PRECISION array, [out]
> dimension (3\*N+2\*QSIZ\*N)

WORK : COMPLEX\*16 array, dimension (QSIZ\*N) [out]

QSTORE : DOUBLE PRECISION array, dimension (N\*\*2+1) [in,out]
> Stores eigenvectors of submatrices encountered during
> divide and conquer, packed together. QPTR points to
> beginning of the submatrices.

QPTR : INTEGER array, dimension (N+2) [in,out]
> List of indices pointing to beginning of submatrices stored
> in QSTORE. The submatrices are numbered starting at the
> bottom left of the divide and conquer tree, from left to
> right and bottom to top.

PRMPTR : INTEGER array, dimension (N lg N) [in]
> Contains a list of pointers which indicate where in PERM a
> level's permutation is stored.  PRMPTR(i+1) - PRMPTR(i)
> indicates the size of the permutation and also the size of
> the full, non-deflated problem.

PERM : INTEGER array, dimension (N lg N) [in]
> Contains the permutations (from deflation and sorting) to be
> applied to each eigenblock.

GIVPTR : INTEGER array, dimension (N lg N) [in]
> Contains a list of pointers which indicate where in GIVCOL a
> level's Givens rotations are stored.  GIVPTR(i+1) - GIVPTR(i)
> indicates the number of Givens rotations.

GIVCOL : INTEGER array, dimension (2, N lg N) [in]
> Each pair of numbers indicates a pair of columns to take place
> in a Givens rotation.

GIVNUM : DOUBLE PRECISION array, dimension (2, N lg N) [in]
> Each number indicates the S value to be used in the
> corresponding Givens rotation.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, an eigenvalue did not converge
