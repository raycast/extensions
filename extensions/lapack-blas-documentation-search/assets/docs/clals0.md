```fortran
subroutine clals0 (
        integer icompq,
        integer nl,
        integer nr,
        integer sqre,
        integer nrhs,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( ldbx, * ) bx,
        integer ldbx,
        integer, dimension( * ) perm,
        integer givptr,
        integer, dimension( ldgcol, * ) givcol,
        integer ldgcol,
        real, dimension( ldgnum, * ) givnum,
        integer ldgnum,
        real, dimension( ldgnum, * ) poles,
        real, dimension( * ) difl,
        real, dimension( ldgnum, * ) difr,
        real, dimension( * ) z,
        integer k,
        real c,
        real s,
        real, dimension( * ) rwork,
        integer info
)
```

CLALS0 applies back the multiplying factors of either the left or the
right singular vector matrix of a diagonal matrix appended by a row
to the right hand side matrix B in solving the least squares problem
using the divide-and-conquer SVD approach.

For the left singular vector matrix, three types of orthogonal
matrices are involved:

(1L) Givens rotations: the number of such rotations is GIVPTR; the
pairs of columns/rows they were applied to are stored in GIVCOL;
and the C- and S-values of these rotations are stored in GIVNUM.

(2L) Permutation. The (NL+1)-st row of B is to be moved to the first
row, and for J=2:N, PERM(J)-th row of B is to be moved to the
J-th row.

(3L) The left singular vector matrix of the remaining matrix.

For the right singular vector matrix, four types of orthogonal
matrices are involved:

(1R) The right singular vector matrix of the remaining matrix.

(2R) If SQRE = 1, one extra Givens rotation to generate the right
null space.

(3R) The inverse transformation of (2L).

(4R) The inverse transformation of (1L).

## Parameters
ICOMPQ : INTEGER [in]
> Specifies whether singular vectors are to be computed in
> factored form:
> = 0: Left singular vector matrix.
> = 1: Right singular vector matrix.

NL : INTEGER [in]
> The row dimension of the upper block. NL >= 1.

NR : INTEGER [in]
> The row dimension of the lower block. NR >= 1.

SQRE : INTEGER [in]
> = 0: the lower block is an NR-by-NR square matrix.
> = 1: the lower block is an NR-by-(NR+1) rectangular matrix.
> 
> The bidiagonal matrix has row dimension N = NL + NR + 1,
> and column dimension M = N + SQRE.

NRHS : INTEGER [in]
> The number of columns of B and BX. NRHS must be at least 1.

B : COMPLEX array, dimension ( LDB, NRHS ) [in,out]
> On input, B contains the right hand sides of the least
> squares problem in rows 1 through M. On output, B contains
> the solution X in rows 1 through N.

LDB : INTEGER [in]
> The leading dimension of B. LDB must be at least
> max(1,MAX( M, N ) ).

BX : COMPLEX array, dimension ( LDBX, NRHS ) [out]

LDBX : INTEGER [in]
> The leading dimension of BX.

PERM : INTEGER array, dimension ( N ) [in]
> The permutations (from deflation and sorting) applied
> to the two blocks.

GIVPTR : INTEGER [in]
> The number of Givens rotations which took place in this
> subproblem.

GIVCOL : INTEGER array, dimension ( LDGCOL, 2 ) [in]
> Each pair of numbers indicates a pair of rows/columns
> involved in a Givens rotation.

LDGCOL : INTEGER [in]
> The leading dimension of GIVCOL, must be at least N.

GIVNUM : REAL array, dimension ( LDGNUM, 2 ) [in]
> Each number indicates the C or S value used in the
> corresponding Givens rotation.

LDGNUM : INTEGER [in]
> The leading dimension of arrays DIFR, POLES and
> GIVNUM, must be at least K.

POLES : REAL array, dimension ( LDGNUM, 2 ) [in]
> On entry, POLES(1:K, 1) contains the new singular
> values obtained from solving the secular equation, and
> POLES(1:K, 2) is an array containing the poles in the secular
> equation.

DIFL : REAL array, dimension ( K ). [in]
> On entry, DIFL(I) is the distance between I-th updated
> (undeflated) singular value and the I-th (undeflated) old
> singular value.

DIFR : REAL array, dimension ( LDGNUM, 2 ). [in]
> On entry, DIFR(I, 1) contains the distances between I-th
> updated (undeflated) singular value and the I+1-th
> (undeflated) old singular value. And DIFR(I, 2) is the
> normalizing factor for the I-th right singular vector.

Z : REAL array, dimension ( K ) [in]
> Contain the components of the deflation-adjusted updating row
> vector.

K : INTEGER [in]
> Contains the dimension of the non-deflated matrix,
> This is the order of the related secular equation. 1 <= K <=N.

C : REAL [in]
> C contains garbage if SQRE =0 and the C-value of a Givens
> rotation related to the right null space if SQRE = 1.

S : REAL [in]
> S contains garbage if SQRE =0 and the S-value of a Givens
> rotation related to the right null space if SQRE = 1.

RWORK : REAL array, dimension [out]
> ( K\*(1+NRHS) + 2\*NRHS )

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
