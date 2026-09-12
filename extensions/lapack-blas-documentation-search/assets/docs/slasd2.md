```fortran
subroutine slasd2 (
        integer nl,
        integer nr,
        integer sqre,
        integer k,
        real, dimension( * ) d,
        real, dimension( * ) z,
        real alpha,
        real beta,
        real, dimension( ldu, * ) u,
        integer ldu,
        real, dimension( ldvt, * ) vt,
        integer ldvt,
        real, dimension( * ) dsigma,
        real, dimension( ldu2, * ) u2,
        integer ldu2,
        real, dimension( ldvt2, * ) vt2,
        integer ldvt2,
        integer, dimension( * ) idxp,
        integer, dimension( * ) idx,
        integer, dimension( * ) idxc,
        integer, dimension( * ) idxq,
        integer, dimension( * ) coltyp,
        integer info
)
```

SLASD2 merges the two sets of singular values together into a single
sorted set.  Then it tries to deflate the size of the problem.
There are two ways in which deflation can occur:  when two or more
singular values are close together or if there is a tiny entry in the
Z vector.  For each such occurrence the order of the related secular
equation problem is reduced by one.

SLASD2 is called from SLASD1.

## Parameters
NL : INTEGER [in]
> The row dimension of the upper block.  NL >= 1.

NR : INTEGER [in]
> The row dimension of the lower block.  NR >= 1.

SQRE : INTEGER [in]
> = 0: the lower block is an NR-by-NR square matrix.
> = 1: the lower block is an NR-by-(NR+1) rectangular matrix.
> 
> The bidiagonal matrix has N = NL + NR + 1 rows and
> M = N + SQRE >= N columns.

K : INTEGER [out]
> Contains the dimension of the non-deflated matrix,
> This is the order of the related secular equation. 1 <= K <=N.

D : REAL array, dimension (N) [in,out]
> On entry D contains the singular values of the two submatrices
> to be combined.  On exit D contains the trailing (N-K) updated
> singular values (those which were deflated) sorted into
> increasing order.

Z : REAL array, dimension (N) [out]
> On exit Z contains the updating row vector in the secular
> equation.

ALPHA : REAL [in]
> Contains the diagonal element associated with the added row.

BETA : REAL [in]
> Contains the off-diagonal element associated with the added
> row.

U : REAL array, dimension (LDU,N) [in,out]
> On entry U contains the left singular vectors of two
> submatrices in the two square blocks with corners at (1,1),
> (NL, NL), and (NL+2, NL+2), (N,N).
> On exit U contains the trailing (N-K) updated left singular
> vectors (those which were deflated) in its last N-K columns.

LDU : INTEGER [in]
> The leading dimension of the array U.  LDU >= N.

VT : REAL array, dimension (LDVT,M) [in,out]
> On entry VT\*\*T contains the right singular vectors of two
> submatrices in the two square blocks with corners at (1,1),
> (NL+1, NL+1), and (NL+2, NL+2), (M,M).
> On exit VT\*\*T contains the trailing (N-K) updated right singular
> vectors (those which were deflated) in its last N-K columns.
> In case SQRE =1, the last row of VT spans the right null
> space.

LDVT : INTEGER [in]
> The leading dimension of the array VT.  LDVT >= M.

DSIGMA : REAL array, dimension (N) [out]
> Contains a copy of the diagonal elements (K-1 singular values
> and one zero) in the secular equation.

U2 : REAL array, dimension (LDU2,N) [out]
> Contains a copy of the first K-1 left singular vectors which
> will be used by SLASD3 in a matrix multiply (SGEMM) to solve
> for the new left singular vectors. U2 is arranged into four
> blocks. The first block contains a column with 1 at NL+1 and
> zero everywhere else; the second block contains non-zero
> entries only at and above NL; the third contains non-zero
> entries only below NL+1; and the fourth is dense.

LDU2 : INTEGER [in]
> The leading dimension of the array U2.  LDU2 >= N.

VT2 : REAL array, dimension (LDVT2,N) [out]
> VT2\*\*T contains a copy of the first K right singular vectors
> which will be used by SLASD3 in a matrix multiply (SGEMM) to
> solve for the new right singular vectors. VT2 is arranged into
> three blocks. The first block contains a row that corresponds
> to the special 0 diagonal element in SIGMA; the second block
> contains non-zeros only at and before NL +1; the third block
> contains non-zeros only at and after  NL +2.

LDVT2 : INTEGER [in]
> The leading dimension of the array VT2.  LDVT2 >= M.

IDXP : INTEGER array, dimension (N) [out]
> This will contain the permutation used to place deflated
> values of D at the end of the array. On output IDXP(2:K)
> points to the nondeflated D-values and IDXP(K+1:N)
> points to the deflated singular values.

IDX : INTEGER array, dimension (N) [out]
> This will contain the permutation used to sort the contents of
> D into ascending order.

IDXC : INTEGER array, dimension (N) [out]
> This will contain the permutation used to arrange the columns
> of the deflated U matrix into three groups:  the first group
> contains non-zero entries only at and above NL, the second
> contains non-zero entries only below NL+2, and the third is
> dense.

IDXQ : INTEGER array, dimension (N) [in,out]
> This contains the permutation which separately sorts the two
> sub-problems in D into ascending order.  Note that entries in
> the first hlaf of this permutation must first be moved one
> position backward; and entries in the second half
> must first have NL+1 added to their values.

COLTYP : INTEGER array, dimension (N) [out]
> As workspace, this will contain a label which will indicate
> which of the following types a column in the U2 matrix or a
> row in the VT2 matrix is:
> 1 : non-zero in the upper half only
> 2 : non-zero in the lower half only
> 3 : dense
> 4 : deflated
> 
> On exit, it is an array of dimension 4, with COLTYP(I) being
> the dimension of the I-th type columns.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
