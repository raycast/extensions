```fortran
subroutine slasda (
        integer icompq,
        integer smlsiz,
        integer n,
        integer sqre,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( ldu, * ) u,
        integer ldu,
        real, dimension( ldu, * ) vt,
        integer, dimension( * ) k,
        real, dimension( ldu, * ) difl,
        real, dimension( ldu, * ) difr,
        real, dimension( ldu, * ) z,
        real, dimension( ldu, * ) poles,
        integer, dimension( * ) givptr,
        integer, dimension( ldgcol, * ) givcol,
        integer ldgcol,
        integer, dimension( ldgcol, * ) perm,
        real, dimension( ldu, * ) givnum,
        real, dimension( * ) c,
        real, dimension( * ) s,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

Using a divide and conquer approach, SLASDA computes the singular
value decomposition (SVD) of a real upper bidiagonal N-by-M matrix
B with diagonal D and offdiagonal E, where M = N + SQRE. The
algorithm computes the singular values in the SVD B = U \* S \* VT.
The orthogonal matrices U and VT are optionally computed in
compact form.

A related subroutine, SLASD0, computes the singular values and
the singular vectors in explicit form.

## Parameters
ICOMPQ : INTEGER [in]
> Specifies whether singular vectors are to be computed
> in compact form, as follows
> = 0: Compute singular values only.
> = 1: Compute singular vectors of upper bidiagonal
> matrix in compact form.

SMLSIZ : INTEGER [in]
> The maximum size of the subproblems at the bottom of the
> computation tree.

N : INTEGER [in]
> The row dimension of the upper bidiagonal matrix. This is
> also the dimension of the main diagonal array D.

SQRE : INTEGER [in]
> Specifies the column dimension of the bidiagonal matrix.
> = 0: The bidiagonal matrix has column dimension M = N;
> = 1: The bidiagonal matrix has column dimension M = N + 1.

D : REAL array, dimension ( N ) [in,out]
> On entry D contains the main diagonal of the bidiagonal
> matrix. On exit D, if INFO = 0, contains its singular values.

E : REAL array, dimension ( M-1 ) [in]
> Contains the subdiagonal entries of the bidiagonal matrix.
> On exit, E has been destroyed.

U : REAL array, [out]
> dimension ( LDU, SMLSIZ ) if ICOMPQ = 1, and not referenced
> if ICOMPQ = 0. If ICOMPQ = 1, on exit, U contains the left
> singular vector matrices of all subproblems at the bottom
> level.

LDU : INTEGER, LDU = > N. [in]
> The leading dimension of arrays U, VT, DIFL, DIFR, POLES,
> GIVNUM, and Z.

VT : REAL array, [out]
> dimension ( LDU, SMLSIZ+1 ) if ICOMPQ = 1, and not referenced
> if ICOMPQ = 0. If ICOMPQ = 1, on exit, VT\*\*T contains the right
> singular vector matrices of all subproblems at the bottom
> level.

K : INTEGER array, dimension ( N ) [out]
> if ICOMPQ = 1 and dimension 1 if ICOMPQ = 0.
> If ICOMPQ = 1, on exit, K(I) is the dimension of the I-th
> secular equation on the computation tree.

DIFL : REAL array, dimension ( LDU, NLVL ), [out]
> where NLVL = floor(log_2 (N/SMLSIZ))).

DIFR : REAL array, [out]
> dimension ( LDU, 2 \* NLVL ) if ICOMPQ = 1 and
> dimension ( N ) if ICOMPQ = 0.
> If ICOMPQ = 1, on exit, DIFL(1:N, I) and DIFR(1:N, 2 \* I - 1)
> record distances between singular values on the I-th
> level and singular values on the (I -1)-th level, and
> DIFR(1:N, 2 \* I ) contains the normalizing factors for
> the right singular vector matrix. See SLASD8 for details.

Z : REAL array, [out]
> dimension ( LDU, NLVL ) if ICOMPQ = 1 and
> dimension ( N ) if ICOMPQ = 0.
> The first K elements of Z(1, I) contain the components of
> the deflation-adjusted updating row vector for subproblems
> on the I-th level.

POLES : REAL array, [out]
> dimension ( LDU, 2 \* NLVL ) if ICOMPQ = 1, and not referenced
> if ICOMPQ = 0. If ICOMPQ = 1, on exit, POLES(1, 2\*I - 1) and
> POLES(1, 2\*I) contain  the new and old singular values
> involved in the secular equations on the I-th level.

GIVPTR : INTEGER array, [out]
> dimension ( N ) if ICOMPQ = 1, and not referenced if
> ICOMPQ = 0. If ICOMPQ = 1, on exit, GIVPTR( I ) records
> the number of Givens rotations performed on the I-th
> problem on the computation tree.

GIVCOL : INTEGER array, [out]
> dimension ( LDGCOL, 2 \* NLVL ) if ICOMPQ = 1, and not
> referenced if ICOMPQ = 0. If ICOMPQ = 1, on exit, for each I,
> GIVCOL(1, 2 \*I - 1) and GIVCOL(1, 2 \*I) record the locations
> of Givens rotations performed on the I-th level on the
> computation tree.

LDGCOL : INTEGER, LDGCOL = > N. [in]
> The leading dimension of arrays GIVCOL and PERM.

PERM : INTEGER array, dimension ( LDGCOL, NLVL ) [out]
> if ICOMPQ = 1, and not referenced
> if ICOMPQ = 0. If ICOMPQ = 1, on exit, PERM(1, I) records
> permutations done on the I-th level of the computation tree.

GIVNUM : REAL array, [out]
> dimension ( LDU,  2 \* NLVL ) if ICOMPQ = 1, and not
> referenced if ICOMPQ = 0. If ICOMPQ = 1, on exit, for each I,
> GIVNUM(1, 2 \*I - 1) and GIVNUM(1, 2 \*I) record the C- and S-
> values of Givens rotations performed on the I-th level on
> the computation tree.

C : REAL array, [out]
> dimension ( N ) if ICOMPQ = 1, and dimension 1 if ICOMPQ = 0.
> If ICOMPQ = 1 and the I-th subproblem is not square, on exit,
> C( I ) contains the C-value of a Givens rotation related to
> the right null space of the I-th subproblem.

S : REAL array, dimension ( N ) if [out]
> ICOMPQ = 1, and dimension 1 if ICOMPQ = 0. If ICOMPQ = 1
> and the I-th subproblem is not square, on exit, S( I )
> contains the S-value of a Givens rotation related to
> the right null space of the I-th subproblem.

WORK : REAL array, dimension [out]
> (6 \* N + (SMLSIZ + 1)\*(SMLSIZ + 1)).

IWORK : INTEGER array, dimension (7\*N). [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, a singular value did not converge
