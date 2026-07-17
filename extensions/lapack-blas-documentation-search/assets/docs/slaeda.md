```fortran
subroutine slaeda (
        integer n,
        integer tlvls,
        integer curlvl,
        integer curpbm,
        integer, dimension( * ) prmptr,
        integer, dimension( * ) perm,
        integer, dimension( * ) givptr,
        integer, dimension( 2, * ) givcol,
        real, dimension( 2, * ) givnum,
        real, dimension( * ) q,
        integer, dimension( * ) qptr,
        real, dimension( * ) z,
        real, dimension( * ) ztemp,
        integer info
)
```

SLAEDA computes the Z vector corresponding to the merge step in the
CURLVLth step of the merge process with TLVLS steps for the CURPBMth
problem.

## Parameters
N : INTEGER [in]
> The dimension of the symmetric tridiagonal matrix.  N >= 0.

TLVLS : INTEGER [in]
> The total number of merging levels in the overall divide and
> conquer tree.

CURLVL : INTEGER [in]
> The current level in the overall merge routine,
> 0 <= curlvl <= tlvls.

CURPBM : INTEGER [in]
> The current problem in the current level in the overall
> merge routine (counting from upper left to lower right).

PRMPTR : INTEGER array, dimension (N lg N) [in]
> Contains a list of pointers which indicate where in PERM a
> level's permutation is stored.  PRMPTR(i+1) - PRMPTR(i)
> indicates the size of the permutation and incidentally the
> size of the full, non-deflated problem.

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

GIVNUM : REAL array, dimension (2, N lg N) [in]
> Each number indicates the S value to be used in the
> corresponding Givens rotation.

Q : REAL array, dimension (N\*\*2) [in]
> Contains the square eigenblocks from previous levels, the
> starting positions for blocks are given by QPTR.

QPTR : INTEGER array, dimension (N+2) [in]
> Contains a list of pointers which indicate where in Q an
> eigenblock is stored.  SQRT( QPTR(i+1) - QPTR(i) ) indicates
> the size of the block.

Z : REAL array, dimension (N) [out]
> On output this vector contains the updating vector (the last
> row of the first sub-eigenvector matrix and the first row of
> the second sub-eigenvector matrix).

ZTEMP : REAL array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
