```fortran
subroutine stgsy2 (
        character trans,
        integer ijob,
        integer m,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( ldc, * ) c,
        integer ldc,
        real, dimension( ldd, * ) d,
        integer ldd,
        real, dimension( lde , * ) e,
        integer lde,
        real, dimension( ldf, * ) f,
        integer ldf,
        real scale,
        real rdsum,
        real rdscal,
        integer, dimension( * ) iwork,
        integer pq,
        integer info
)
```

STGSY2 solves the generalized Sylvester equation:

A \* R - L \* B = scale \* C                (1)
D \* R - L \* E = scale \* F,

using Level 1 and 2 BLAS. where R and L are unknown M-by-N matrices,
(A, D), (B, E) and (C, F) are given matrix pairs of size M-by-M,
N-by-N and M-by-N, respectively, with real entries. (A, D) and (B, E)
must be in generalized Schur canonical form, i.e. A, B are upper
quasi triangular and D, E are upper triangular. The solution (R, L)
overwrites (C, F). 0 <= SCALE <= 1 is an output scaling factor
chosen to avoid overflow.

In matrix notation solving equation (1) corresponds to solve
Z\*x = scale\*b, where Z is defined as

Z = [ kron(In, A)  -kron(B\*\*T, Im) ]             (2)
[ kron(In, D)  -kron(E\*\*T, Im) ],

Ik is the identity matrix of size k and X\*\*T is the transpose of X.
kron(X, Y) is the Kronecker product between the matrices X and Y.
In the process of solving (1), we solve a number of such systems
where Dim(In), Dim(In) = 1 or 2.

If TRANS = 'T', solve the transposed system Z\*\*T\*y = scale\*b for y,
which is equivalent to solve for R and L in

A\*\*T \* R  + D\*\*T \* L   = scale \* C           (3)
R  \* B\*\*T + L  \* E\*\*T  = scale \* -F

This case is used to compute an estimate of Dif[(A, D), (B, E)] =
sigma_min(Z) using reverse communication with SLACON.

STGSY2 also (IJOB >= 1) contributes to the computation in STGSYL
of an upper bound on the separation between to matrix pairs. Then
the input (A, D), (B, E) are sub-pencils of the matrix pair in
STGSYL. See STGSYL for details.

## Parameters
TRANS : CHARACTER\*1 [in]
> = 'N': solve the generalized Sylvester equation (1).
> = 'T': solve the 'transposed' system (3).

IJOB : INTEGER [in]
> Specifies what kind of functionality to be performed.
> = 0: solve (1) only.
> = 1: A contribution from this subsystem to a Frobenius
> norm-based estimate of the separation between two matrix
> pairs is computed. (look ahead strategy is used).
> = 2: A contribution from this subsystem to a Frobenius
> norm-based estimate of the separation between two matrix
> pairs is computed. (SGECON on sub-systems is used.)
> Not referenced if TRANS = 'T'.

M : INTEGER [in]
> On entry, M specifies the order of A and D, and the row
> dimension of C, F, R and L.

N : INTEGER [in]
> On entry, N specifies the order of B and E, and the column
> dimension of C, F, R and L.

A : REAL array, dimension (LDA, M) [in]
> On entry, A contains an upper quasi triangular matrix.

LDA : INTEGER [in]
> The leading dimension of the matrix A. LDA >= max(1, M).

B : REAL array, dimension (LDB, N) [in]
> On entry, B contains an upper quasi triangular matrix.

LDB : INTEGER [in]
> The leading dimension of the matrix B. LDB >= max(1, N).

C : REAL array, dimension (LDC, N) [in,out]
> On entry, C contains the right-hand-side of the first matrix
> equation in (1).
> On exit, if IJOB = 0, C has been overwritten by the
> solution R.

LDC : INTEGER [in]
> The leading dimension of the matrix C. LDC >= max(1, M).

D : REAL array, dimension (LDD, M) [in]
> On entry, D contains an upper triangular matrix.

LDD : INTEGER [in]
> The leading dimension of the matrix D. LDD >= max(1, M).

E : REAL array, dimension (LDE, N) [in]
> On entry, E contains an upper triangular matrix.

LDE : INTEGER [in]
> The leading dimension of the matrix E. LDE >= max(1, N).

F : REAL array, dimension (LDF, N) [in,out]
> On entry, F contains the right-hand-side of the second matrix
> equation in (1).
> On exit, if IJOB = 0, F has been overwritten by the
> solution L.

LDF : INTEGER [in]
> The leading dimension of the matrix F. LDF >= max(1, M).

SCALE : REAL [out]
> On exit, 0 <= SCALE <= 1. If 0 < SCALE < 1, the solutions
> R and L (C and F on entry) will hold the solutions to a
> slightly perturbed system but the input matrices A, B, D and
> E have not been changed. If SCALE = 0, R and L will hold the
> solutions to the homogeneous system with C = F = 0. Normally,
> SCALE = 1.

RDSUM : REAL [in,out]
> On entry, the sum of squares of computed contributions to
> the Dif-estimate under computation by STGSYL, where the
> scaling factor RDSCAL (see below) has been factored out.
> On exit, the corresponding sum of squares updated with the
> contributions from the current sub-system.
> If TRANS = 'T' RDSUM is not touched.
> NOTE: RDSUM only makes sense when STGSY2 is called by STGSYL.

RDSCAL : REAL [in,out]
> On entry, scaling factor used to prevent overflow in RDSUM.
> On exit, RDSCAL is updated w.r.t. the current contributions
> in RDSUM.
> If TRANS = 'T', RDSCAL is not touched.
> NOTE: RDSCAL only makes sense when STGSY2 is called by
> STGSYL.

IWORK : INTEGER array, dimension (M+N+2) [out]

PQ : INTEGER [out]
> On exit, the number of subsystems (of size 2-by-2, 4-by-4 and
> 8-by-8) solved by this routine.

INFO : INTEGER [out]
> On exit, if INFO is set to
> =0: Successful exit
> <0: If INFO = -i, the i-th argument had an illegal value.
> >0: The matrix pairs (A, D) and (B, E) have common or very
> close eigenvalues.
