```fortran
subroutine dtgsen (
        integer ijob,
        logical wantq,
        logical wantz,
        logical, dimension( * ) select,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision, dimension( * ) alphar,
        double precision, dimension( * ) alphai,
        double precision, dimension( * ) beta,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        double precision, dimension( ldz, * ) z,
        integer ldz,
        integer m,
        double precision pl,
        double precision pr,
        double precision, dimension( * ) dif,
        double precision, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer liwork,
        integer info
)
```

DTGSEN reorders the generalized real Schur decomposition of a real
matrix pair (A, B) (in terms of an orthonormal equivalence trans-
formation Q\*\*T \* (A, B) \* Z), so that a selected cluster of eigenvalues
appears in the leading diagonal blocks of the upper quasi-triangular
matrix A and the upper triangular B. The leading columns of Q and
Z form orthonormal bases of the corresponding left and right eigen-
spaces (deflating subspaces). (A, B) must be in generalized real
Schur canonical form (as returned by DGGES), i.e. A is block upper
triangular with 1-by-1 and 2-by-2 diagonal blocks. B is upper
triangular.

DTGSEN also computes the generalized eigenvalues

w(j) = (ALPHAR(j) + i\*ALPHAI(j))/BETA(j)

of the reordered matrix pair (A, B).

Optionally, DTGSEN computes the estimates of reciprocal condition
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
> SELECT specifies the eigenvalues in the selected cluster.
> To select a real eigenvalue w(j), SELECT(j) must be set to
> .TRUE.. To select a complex conjugate pair of eigenvalues
> w(j) and w(j+1), corresponding to a 2-by-2 diagonal block,
> either SELECT(j) or SELECT(j+1) or both must be set to
> .TRUE.; a complex conjugate pair of eigenvalues must be
> either both included in the cluster or both excluded.

N : INTEGER [in]
> The order of the matrices A and B. N >= 0.

A : DOUBLE PRECISION array, dimension(LDA,N) [in,out]
> On entry, the upper quasi-triangular matrix A, with (A, B) in
> generalized real Schur canonical form.
> On exit, A is overwritten by the reordered matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,N).

B : DOUBLE PRECISION array, dimension(LDB,N) [in,out]
> On entry, the upper triangular matrix B, with (A, B) in
> generalized real Schur canonical form.
> On exit, B is overwritten by the reordered matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,N).

ALPHAR : DOUBLE PRECISION array, dimension (N) [out]

ALPHAI : DOUBLE PRECISION array, dimension (N) [out]

BETA : DOUBLE PRECISION array, dimension (N) [out]
> 
> On exit, (ALPHAR(j) + ALPHAI(j)\*i)/BETA(j), j=1,...,N, will
> be the generalized eigenvalues.  ALPHAR(j) + ALPHAI(j)\*i
> and BETA(j),j=1,...,N  are the diagonals of the complex Schur
> form (S,T) that would result if the 2-by-2 diagonal blocks of
> the real generalized Schur form of (A,B) were further reduced
> to triangular form using complex unitary transformations.
> If ALPHAI(j) is zero, then the j-th eigenvalue is real; if
> positive, then the j-th and (j+1)-st eigenvalues are a
> complex conjugate pair, with ALPHAI(j+1) negative.

Q : DOUBLE PRECISION array, dimension (LDQ,N) [in,out]
> On entry, if WANTQ = .TRUE., Q is an N-by-N matrix.
> On exit, Q has been postmultiplied by the left orthogonal
> transformation matrix which reorder (A, B); The leading M
> columns of Q form orthonormal bases for the specified pair of
> left eigenspaces (deflating subspaces).
> If WANTQ = .FALSE., Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= 1;
> and if WANTQ = .TRUE., LDQ >= N.

Z : DOUBLE PRECISION array, dimension (LDZ,N) [in,out]
> On entry, if WANTZ = .TRUE., Z is an N-by-N matrix.
> On exit, Z has been postmultiplied by the left orthogonal
> transformation matrix which reorder (A, B); The leading M
> columns of Z form orthonormal bases for the specified pair of
> left eigenspaces (deflating subspaces).
> If WANTZ = .FALSE., Z is not referenced.

LDZ : INTEGER [in]
> The leading dimension of the array Z. LDZ >= 1;
> If WANTZ = .TRUE., LDZ >= N.

M : INTEGER [out]
> The dimension of the specified pair of left and right eigen-
> spaces (deflating subspaces). 0 <= M <= N.

PL : DOUBLE PRECISION [out]

PR : DOUBLE PRECISION [out]
> 
> If IJOB = 1, 4 or 5, PL, PR are lower bounds on the
> reciprocal of the norm of  onto left and right
> eigenspaces with respect to the selected cluster.
> 0 < PL, PR <= 1.
> If M = 0 or M = N, PL = PR  = 1.
> If IJOB = 0, 2 or 3, PL and PR are not referenced.

DIF : DOUBLE PRECISION array, dimension (2). [out]
> If IJOB >= 2, DIF(1:2) store the estimates of Difu and Difl.
> If IJOB = 2 or 4, DIF(1:2) are F-norm-based upper bounds on
> Difu and Difl. If IJOB = 3 or 5, DIF(1:2) are 1-norm-based
> estimates of Difu and Difl.
> If M = 0 or N, DIF(1:2) = F-norm([A, B]).
> If IJOB = 0 or 1, DIF is not referenced.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >=  4\*N+16.
> If IJOB = 1, 2 or 4, LWORK >= MAX(4\*N+16, 2\*M\*(N-M)).
> If IJOB = 3 or 5, LWORK >= MAX(4\*N+16, 4\*M\*(N-M)).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (MAX(1,LIWORK)) [out]
> On exit, if INFO = 0, IWORK(1) returns the optimal LIWORK.

LIWORK : INTEGER [in]
> The dimension of the array IWORK. LIWORK >= 1.
> If IJOB = 1, 2 or 4, LIWORK >=  N+6.
> If IJOB = 3 or 5, LIWORK >= MAX(2\*M\*(N-M), N+6).
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
