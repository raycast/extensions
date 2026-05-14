```fortran
subroutine dlasd7 (
        integer icompq,
        integer nl,
        integer nr,
        integer sqre,
        integer k,
        double precision, dimension( * ) d,
        double precision, dimension( * ) z,
        double precision, dimension( * ) zw,
        double precision, dimension( * ) vf,
        double precision, dimension( * ) vfw,
        double precision, dimension( * ) vl,
        double precision, dimension( * ) vlw,
        double precision alpha,
        double precision beta,
        double precision, dimension( * ) dsigma,
        integer, dimension( * ) idx,
        integer, dimension( * ) idxp,
        integer, dimension( * ) idxq,
        integer, dimension( * ) perm,
        integer givptr,
        integer, dimension( ldgcol, * ) givcol,
        integer ldgcol,
        double precision, dimension( ldgnum, * ) givnum,
        integer ldgnum,
        double precision c,
        double precision s,
        integer info
)
```

DLASD7 merges the two sets of singular values together into a single
sorted set. Then it tries to deflate the size of the problem. There
are two ways in which deflation can occur:  when two or more singular
values are close together or if there is a tiny entry in the Z
vector. For each such occurrence the order of the related
secular equation problem is reduced by one.

DLASD7 is called from DLASD6.

## Parameters
ICOMPQ : INTEGER [in]
> Specifies whether singular vectors are to be computed
> in compact form, as follows:
> = 0: Compute singular values only.
> = 1: Compute singular vectors of upper
> bidiagonal matrix in compact form.

NL : INTEGER [in]
> The row dimension of the upper block. NL >= 1.

NR : INTEGER [in]
> The row dimension of the lower block. NR >= 1.

SQRE : INTEGER [in]
> = 0: the lower block is an NR-by-NR square matrix.
> = 1: the lower block is an NR-by-(NR+1) rectangular matrix.
> 
> The bidiagonal matrix has
> N = NL + NR + 1 rows and
> M = N + SQRE >= N columns.

K : INTEGER [out]
> Contains the dimension of the non-deflated matrix, this is
> the order of the related secular equation. 1 <= K <=N.

D : DOUBLE PRECISION array, dimension ( N ) [in,out]
> On entry D contains the singular values of the two submatrices
> to be combined. On exit D contains the trailing (N-K) updated
> singular values (those which were deflated) sorted into
> increasing order.

Z : DOUBLE PRECISION array, dimension ( M ) [out]
> On exit Z contains the updating row vector in the secular
> equation.

ZW : DOUBLE PRECISION array, dimension ( M ) [out]
> Workspace for Z.

VF : DOUBLE PRECISION array, dimension ( M ) [in,out]
> On entry, VF(1:NL+1) contains the first components of all
> right singular vectors of the upper block; and VF(NL+2:M)
> contains the first components of all right singular vectors
> of the lower block. On exit, VF contains the first components
> of all right singular vectors of the bidiagonal matrix.

VFW : DOUBLE PRECISION array, dimension ( M ) [out]
> Workspace for VF.

VL : DOUBLE PRECISION array, dimension ( M ) [in,out]
> On entry, VL(1:NL+1) contains the  last components of all
> right singular vectors of the upper block; and VL(NL+2:M)
> contains the last components of all right singular vectors
> of the lower block. On exit, VL contains the last components
> of all right singular vectors of the bidiagonal matrix.

VLW : DOUBLE PRECISION array, dimension ( M ) [out]
> Workspace for VL.

ALPHA : DOUBLE PRECISION [in]
> Contains the diagonal element associated with the added row.

BETA : DOUBLE PRECISION [in]
> Contains the off-diagonal element associated with the added
> row.

DSIGMA : DOUBLE PRECISION array, dimension ( N ) [out]
> Contains a copy of the diagonal elements (K-1 singular values
> and one zero) in the secular equation.

IDX : INTEGER array, dimension ( N ) [out]
> This will contain the permutation used to sort the contents of
> D into ascending order.

IDXP : INTEGER array, dimension ( N ) [out]
> This will contain the permutation used to place deflated
> values of D at the end of the array. On output IDXP(2:K)
> points to the nondeflated D-values and IDXP(K+1:N)
> points to the deflated singular values.

IDXQ : INTEGER array, dimension ( N ) [in]
> This contains the permutation which separately sorts the two
> sub-problems in D into ascending order.  Note that entries in
> the first half of this permutation must first be moved one
> position backward; and entries in the second half
> must first have NL+1 added to their values.

PERM : INTEGER array, dimension ( N ) [out]
> The permutations (from deflation and sorting) to be applied
> to each singular block. Not referenced if ICOMPQ = 0.

GIVPTR : INTEGER [out]
> The number of Givens rotations which took place in this
> subproblem. Not referenced if ICOMPQ = 0.

GIVCOL : INTEGER array, dimension ( LDGCOL, 2 ) [out]
> Each pair of numbers indicates a pair of columns to take place
> in a Givens rotation. Not referenced if ICOMPQ = 0.

LDGCOL : INTEGER [in]
> The leading dimension of GIVCOL, must be at least N.

GIVNUM : DOUBLE PRECISION array, dimension ( LDGNUM, 2 ) [out]
> Each number indicates the C or S value to be used in the
> corresponding Givens rotation. Not referenced if ICOMPQ = 0.

LDGNUM : INTEGER [in]
> The leading dimension of GIVNUM, must be at least N.

C : DOUBLE PRECISION [out]
> C contains garbage if SQRE =0 and the C-value of a Givens
> rotation related to the right null space if SQRE = 1.

S : DOUBLE PRECISION [out]
> S contains garbage if SQRE =0 and the S-value of a Givens
> rotation related to the right null space if SQRE = 1.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
