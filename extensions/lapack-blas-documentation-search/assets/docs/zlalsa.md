```fortran
subroutine zlalsa (
        integer icompq,
        integer smlsiz,
        integer n,
        integer nrhs,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        complex*16, dimension( ldbx, * ) bx,
        integer ldbx,
        double precision, dimension( ldu, * ) u,
        integer ldu,
        double precision, dimension( ldu, * ) vt,
        integer, dimension( * ) k,
        double precision, dimension( ldu, * ) difl,
        double precision, dimension( ldu, * ) difr,
        double precision, dimension( ldu, * ) z,
        double precision, dimension( ldu, * ) poles,
        integer, dimension( * ) givptr,
        integer, dimension( ldgcol, * ) givcol,
        integer ldgcol,
        integer, dimension( ldgcol, * ) perm,
        double precision, dimension( ldu, * ) givnum,
        double precision, dimension( * ) c,
        double precision, dimension( * ) s,
        double precision, dimension( * ) rwork,
        integer, dimension( * ) iwork,
        integer info
)
```

ZLALSA is an intermediate step in solving the least squares problem
by computing the SVD of the coefficient matrix in compact form (The
singular vectors are computed as products of simple orthogonal
matrices.).

If ICOMPQ = 0, ZLALSA applies the inverse of the left singular vector
matrix of an upper bidiagonal matrix to the right hand side; and if
ICOMPQ = 1, ZLALSA applies the right singular vector matrix to the
right hand side. The singular vector matrices were generated in
compact form by ZLALSA.

## Parameters
ICOMPQ : INTEGER [in]
> Specifies whether the left or the right singular vector
> matrix is involved.
> = 0: Left singular vector matrix
> = 1: Right singular vector matrix

SMLSIZ : INTEGER [in]
> The maximum size of the subproblems at the bottom of the
> computation tree.

N : INTEGER [in]
> The row and column dimensions of the upper bidiagonal matrix.

NRHS : INTEGER [in]
> The number of columns of B and BX. NRHS must be at least 1.

B : COMPLEX\*16 array, dimension ( LDB, NRHS ) [in,out]
> On input, B contains the right hand sides of the least
> squares problem in rows 1 through M.
> On output, B contains the solution X in rows 1 through N.

LDB : INTEGER [in]
> The leading dimension of B in the calling subprogram.
> LDB must be at least max(1,MAX( M, N ) ).

BX : COMPLEX\*16 array, dimension ( LDBX, NRHS ) [out]
> On exit, the result of applying the left or right singular
> vector matrix to B.

LDBX : INTEGER [in]
> The leading dimension of BX.

U : DOUBLE PRECISION array, dimension ( LDU, SMLSIZ ). [in]
> On entry, U contains the left singular vector matrices of all
> subproblems at the bottom level.

LDU : INTEGER, LDU = > N. [in]
> The leading dimension of arrays U, VT, DIFL, DIFR,
> POLES, GIVNUM, and Z.

VT : DOUBLE PRECISION array, dimension ( LDU, SMLSIZ+1 ). [in]
> On entry, VT\*\*H contains the right singular vector matrices of
> all subproblems at the bottom level.

K : INTEGER array, dimension ( N ). [in]

DIFL : DOUBLE PRECISION array, dimension ( LDU, NLVL ). [in]
> where NLVL = INT(log_2 (N/(SMLSIZ+1))) + 1.

DIFR : DOUBLE PRECISION array, dimension ( LDU, 2 \* NLVL ). [in]
> On entry, DIFL(\*, I) and DIFR(\*, 2 \* I -1) record
> distances between singular values on the I-th level and
> singular values on the (I -1)-th level, and DIFR(\*, 2 \* I)
> record the normalizing factors of the right singular vectors
> matrices of subproblems on I-th level.

Z : DOUBLE PRECISION array, dimension ( LDU, NLVL ). [in]
> On entry, Z(1, I) contains the components of the deflation-
> adjusted updating row vector for subproblems on the I-th
> level.

POLES : DOUBLE PRECISION array, dimension ( LDU, 2 \* NLVL ). [in]
> On entry, POLES(\*, 2 \* I -1: 2 \* I) contains the new and old
> singular values involved in the secular equations on the I-th
> level.

GIVPTR : INTEGER array, dimension ( N ). [in]
> On entry, GIVPTR( I ) records the number of Givens
> rotations performed on the I-th problem on the computation
> tree.

GIVCOL : INTEGER array, dimension ( LDGCOL, 2 \* NLVL ). [in]
> On entry, for each I, GIVCOL(\*, 2 \* I - 1: 2 \* I) records the
> locations of Givens rotations performed on the I-th level on
> the computation tree.

LDGCOL : INTEGER, LDGCOL = > N. [in]
> The leading dimension of arrays GIVCOL and PERM.

PERM : INTEGER array, dimension ( LDGCOL, NLVL ). [in]
> On entry, PERM(\*, I) records permutations done on the I-th
> level of the computation tree.

GIVNUM : DOUBLE PRECISION array, dimension ( LDU, 2 \* NLVL ). [in]
> On entry, GIVNUM(\*, 2 \*I -1 : 2 \* I) records the C- and S-
> values of Givens rotations performed on the I-th level on the
> computation tree.

C : DOUBLE PRECISION array, dimension ( N ). [in]
> On entry, if the I-th subproblem is not square,
> C( I ) contains the C-value of a Givens rotation related to
> the right null space of the I-th subproblem.

S : DOUBLE PRECISION array, dimension ( N ). [in]
> On entry, if the I-th subproblem is not square,
> S( I ) contains the S-value of a Givens rotation related to
> the right null space of the I-th subproblem.

RWORK : DOUBLE PRECISION array, dimension at least [out]
> MAX( (SMLSZ+1)\*NRHS\*3, N\*(1+NRHS) + 2\*NRHS ).

IWORK : INTEGER array, dimension (3\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
