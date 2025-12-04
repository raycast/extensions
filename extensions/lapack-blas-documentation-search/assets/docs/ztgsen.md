```fortran
subroutine ztgsen (
        integer ijob,
        logical wantq,
        logical wantz,
        logical, dimension( * ) select,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        complex*16, dimension( * ) alpha,
        complex*16, dimension( * ) beta,
        complex*16, dimension( ldq, * ) q,
        integer ldq,
        complex*16, dimension( ldz, * ) z,
        integer ldz,
        integer m,
        double precision pl,
        double precision pr,
        double precision, dimension( * ) dif,
        complex*16, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer liwork,
        integer info
)
```

ZTGSEN reorders the generalized Schur decomposition of a complex
matrix pair (A, B) (in terms of an unitary equivalence trans-
formation Q\*\*H \* (A, B) \* Z), so that a selected cluster of eigenvalues
appears in the leading diagonal blocks of the pair (A,B). The leading
columns of Q and Z form unitary bases of the corresponding left and
right eigenspaces (deflating subspaces). (A, B) must be in
generalized Schur canonical form, that is, A and B are both upper
triangular.

ZTGSEN also computes the generalized eigenvalues

w(j)= ALPHA(j) / BETA(j)

of the reordered matrix pair (A, B).

Optionally, the routine computes estimates of reciprocal condition
numbers for eigenvalues and eigenspaces. These are Difu[(A11,B11),
(A22,B22)] and Difl[(A11,B11), (A22,B22)], i.e. the separation(s)
between the matrix pairs (A11, B11) and (A22,B22) that correspond to
the selected cluster and the eigenvalues outside the cluster, resp.,
and norms of  onto left and right eigenspaces w.r.t.
the selected cluster in the (1,1)-block.

## Parameters
IJOB : INTEGER [in]
> Specifies whether condition numbers are required for the
> cluster of eigenvalues (PL and PR) or the deflating subspaces
> (Difu and Difl):
> =0: Only reorder w.r.t. SELECT. No extras.
> =1: Reciprocal of norms of  onto left and right
> eigenspaces w.r.t. the selected cluster (PL and PR).
> =2: Upper bounds on Difu and Difl. F-norm-based estimate
> (DIF(1:2)).
> =3: Estimate of Difu and Difl. 1-norm-based estimate
> (DIF(1:2)).
> About 5 times as expensive as IJOB = 2.
> =4: Compute PL, PR and DIF (i.e. 0, 1 and 2 above): Economic
> version to get it all.
> =5: Compute PL, PR and DIF (i.e. 0, 1 and 3 above)

WANTQ : LOGICAL [in]
> .TRUE. : update the left transformation matrix Q;
> .FALSE.: do not update Q.

WANTZ : LOGICAL [in]
> .TRUE. : update the right transformation matrix Z;
> .FALSE.: do not update Z.

SELECT : LOGICAL array, dimension (N) [in]
> SELECT specifies the eigenvalues in the selected cluster. To
> select an eigenvalue w(j), SELECT(j) must be set to
> .TRUE..

N : INTEGER [in]
> The order of the matrices A and B. N >= 0.

A : COMPLEX\*16 array, dimension(LDA,N) [in,out]
> On entry, the upper triangular matrix A, in generalized
> Schur canonical form.
> On exit, A is overwritten by the reordered matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,N).

B : COMPLEX\*16 array, dimension(LDB,N) [in,out]
> On entry, the upper triangular matrix B, in generalized
> Schur canonical form.
> On exit, B is overwritten by the reordered matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,N).

ALPHA : COMPLEX\*16 array, dimension (N) [out]

BETA : COMPLEX\*16 array, dimension (N) [out]
> 
> The diagonal elements of A and B, respectively,
> when the pair (A,B) has been reduced to generalized Schur
> form.  ALPHA(i)/BETA(i) i=1,...,N are the generalized
> eigenvalues.

Q : COMPLEX\*16 array, dimension (LDQ,N) [in,out]
> On entry, if WANTQ = .TRUE., Q is an N-by-N matrix.
> On exit, Q has been postmultiplied by the left unitary
> transformation matrix which reorder (A, B); The leading M
> columns of Q form orthonormal bases for the specified pair of
> left eigenspaces (deflating subspaces).
> If WANTQ = .FALSE., Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q. LDQ >= 1.
> If WANTQ = .TRUE., LDQ >= N.

Z : COMPLEX\*16 array, dimension (LDZ,N) [in,out]
> On entry, if WANTZ = .TRUE., Z is an N-by-N matrix.
> On exit, Z has been postmultiplied by the left unitary
> transformation matrix which reorder (A, B); The leading M
> columns of Z form orthonormal bases for the specified pair of
> left eigenspaces (deflating subspaces).
> If WANTZ = .FALSE., Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z. LDZ >= 1.
> If WANTZ = .TRUE., LDZ >= N.

M : INTEGER [out]
> The dimension of the specified pair of left and right
> eigenspaces, (deflating subspaces) 0 <= M <= N.

PL : DOUBLE PRECISION [out]

PR : DOUBLE PRECISION [out]
> 
> If IJOB = 1, 4 or 5, PL, PR are lower bounds on the
> reciprocal  of the norm of  onto left and right
> eigenspace with respect to the selected cluster.
> 0 < PL, PR <= 1.
> If M = 0 or M = N, PL = PR  = 1.
> If IJOB = 0, 2 or 3 PL, PR are not referenced.

DIF : DOUBLE PRECISION array, dimension (2). [out]
> If IJOB >= 2, DIF(1:2) store the estimates of Difu and Difl.
> If IJOB = 2 or 4, DIF(1:2) are F-norm-based upper bounds on
> Difu and Difl. If IJOB = 3 or 5, DIF(1:2) are 1-norm-based
> estimates of Difu and Difl, computed using reversed
> communication with ZLACN2.
> If M = 0 or N, DIF(1:2) = F-norm([A, B]).
> If IJOB = 0 or 1, DIF is not referenced.

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >=  1
> If IJOB = 1, 2 or 4, LWORK >=  2\*M\*(N-M)
> If IJOB = 3 or 5, LWORK >=  4\*M\*(N-M)
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (MAX(1,LIWORK)) [out]
> On exit, if INFO = 0, IWORK(1) returns the optimal LIWORK.

LIWORK : INTEGER [in]
> The dimension of the array IWORK. LIWORK >= 1.
> If IJOB = 1, 2 or 4, LIWORK >=  N+2;
> If IJOB = 3 or 5, LIWORK >= MAX(N+2, 2\*M\*(N-M));
> 
> If LIWORK = -1, then a workspace query is assumed; the
> routine only calculates the optimal size of the IWORK array,
> returns this value as the first entry of the IWORK array, and
> no error message related to LIWORK is issued by XERBLA.

INFO : INTEGER [out]
> =0: Successful exit.
> <0: If INFO = -i, the i-th argument had an illegal value.
> =1: Reordering of (A, B) failed because the transformed
> matrix pair (A, B) would be too far from generalized
> Schur form; the problem is very ill-conditioned.
> (A, B) may have been partially reordered.
> If requested, 0 is returned in DIF(\*), PL and PR.
