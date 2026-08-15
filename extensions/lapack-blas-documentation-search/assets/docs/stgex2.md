```fortran
subroutine stgex2 (
        logical wantq,
        logical wantz,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( ldq, * ) q,
        integer ldq,
        real, dimension( ldz, * ) z,
        integer ldz,
        integer j1,
        integer n1,
        integer n2,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

STGEX2 swaps adjacent diagonal blocks (A11, B11) and (A22, B22)
of size 1-by-1 or 2-by-2 in an upper (quasi) triangular matrix pair
(A, B) by an orthogonal equivalence transformation.

(A, B) must be in generalized real Schur canonical form (as returned
by SGGES), i.e. A is block upper triangular with 1-by-1 and 2-by-2
diagonal blocks. B is upper triangular.

Optionally, the matrices Q and Z of generalized Schur vectors are
updated.

Q(in) \* A(in) \* Z(in)\*\*T = Q(out) \* A(out) \* Z(out)\*\*T
Q(in) \* B(in) \* Z(in)\*\*T = Q(out) \* B(out) \* Z(out)\*\*T

## Parameters
WANTQ : LOGICAL [in]
> .TRUE. : update the left transformation matrix Q;
> .FALSE.: do not update Q.

WANTZ : LOGICAL [in]
> .TRUE. : update the right transformation matrix Z;
> .FALSE.: do not update Z.

N : INTEGER [in]
> The order of the matrices A and B. N >= 0.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the matrix A in the pair (A, B).
> On exit, the updated matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,N).

B : REAL array, dimension (LDB,N) [in,out]
> On entry, the matrix B in the pair (A, B).
> On exit, the updated matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,N).

Q : REAL array, dimension (LDQ,N) [in,out]
> On entry, if WANTQ = .TRUE., the orthogonal matrix Q.
> On exit, the updated matrix Q.
> Not referenced if WANTQ = .FALSE..

LDQ : INTEGER [in]
> The leading dimension of the array Q. LDQ >= 1.
> If WANTQ = .TRUE., LDQ >= N.

Z : REAL array, dimension (LDZ,N) [in,out]
> On entry, if WANTZ =.TRUE., the orthogonal matrix Z.
> On exit, the updated matrix Z.
> Not referenced if WANTZ = .FALSE..

LDZ : INTEGER [in]
> The leading dimension of the array Z. LDZ >= 1.
> If WANTZ = .TRUE., LDZ >= N.

J1 : INTEGER [in]
> The index to the first block (A11, B11). 1 <= J1 <= N.

N1 : INTEGER [in]
> The order of the first block (A11, B11). N1 = 0, 1 or 2.

N2 : INTEGER [in]
> The order of the second block (A22, B22). N2 = 0, 1 or 2.

WORK : REAL array, dimension (MAX(1,LWORK)). [out]

LWORK : INTEGER [in]
> The dimension of the array WORK.
> LWORK >=  MAX( N\*(N2+N1), (N2+N1)\*(N2+N1)\*2 )

INFO : INTEGER [out]
> =0: Successful exit
> >0: If INFO = 1, the transformed matrix (A, B) would be
> too far from generalized Schur form; the blocks are
> not swapped and (A, B) and (Q, Z) are unchanged.
> The problem of swapping is too ill-conditioned.
> <0: If INFO = -16: LWORK is too small. Appropriate value
> for LWORK is returned in WORK(1).
