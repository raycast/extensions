```fortran
subroutine ctgexc (
        logical wantq,
        logical wantz,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( ldq, * ) q,
        integer ldq,
        complex, dimension( ldz, * ) z,
        integer ldz,
        integer ifst,
        integer ilst,
        integer info
)
```

CTGEXC reorders the generalized Schur decomposition of a complex
matrix pair (A,B), using an unitary equivalence transformation
(A, B) := Q \* (A, B) \* Z\*\*H, so that the diagonal block of (A, B) with
row index IFST is moved to row ILST.

(A, B) must be in generalized Schur canonical form, that is, A and
B are both upper triangular.

Optionally, the matrices Q and Z of generalized Schur vectors are
updated.

Q(in) \* A(in) \* Z(in)\*\*H = Q(out) \* A(out) \* Z(out)\*\*H
Q(in) \* B(in) \* Z(in)\*\*H = Q(out) \* B(out) \* Z(out)\*\*H

## Parameters
WANTQ : LOGICAL [in]
> .TRUE. : update the left transformation matrix Q;
> .FALSE.: do not update Q.

WANTZ : LOGICAL [in]
> .TRUE. : update the right transformation matrix Z;
> .FALSE.: do not update Z.

N : INTEGER [in]
> The order of the matrices A and B. N >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the upper triangular matrix A in the pair (A, B).
> On exit, the updated matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,N).

B : COMPLEX array, dimension (LDB,N) [in,out]
> On entry, the upper triangular matrix B in the pair (A, B).
> On exit, the updated matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,N).

Q : COMPLEX array, dimension (LDQ,N) [in,out]
> On entry, if WANTQ = .TRUE., the unitary matrix Q.
> On exit, the updated matrix Q.
> If WANTQ = .FALSE., Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q. LDQ >= 1;
> If WANTQ = .TRUE., LDQ >= N.

Z : COMPLEX array, dimension (LDZ,N) [in,out]
> On entry, if WANTZ = .TRUE., the unitary matrix Z.
> On exit, the updated matrix Z.
> If WANTZ = .FALSE., Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z. LDZ >= 1;
> If WANTZ = .TRUE., LDZ >= N.

IFST : INTEGER [in]

ILST : INTEGER [in,out]
> Specify the reordering of the diagonal blocks of (A, B).
> The block with row index IFST is moved to row ILST, by a
> sequence of swapping between adjacent blocks.

INFO : INTEGER [out]
> =0:  Successful exit.
> <0:  if INFO = -i, the i-th argument had an illegal value.
> =1:  The transformed matrix pair (A, B) would be too far
> from generalized Schur form; the problem is ill-
> conditioned. (A, B) may have been partially reordered,
> and ILST points to the first row of the current
> position of the block being moved.
