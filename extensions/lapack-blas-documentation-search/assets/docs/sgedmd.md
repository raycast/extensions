```fortran
subroutine sgedmd (
        character, intent(in) jobs,
        character, intent(in) jobz,
        character, intent(in) jobr,
        character, intent(in) jobf,
        integer, intent(in) whtsvd,
        integer, intent(in) m,
        integer, intent(in) n,
        real(kind=wp), dimension(ldx,*), intent(inout) x,
        integer, intent(in) ldx,
        real(kind=wp), dimension(ldy,*), intent(inout) y,
        integer, intent(in) ldy,
        integer, intent(in) nrnk,
        real(kind=wp), intent(in) tol,
        integer, intent(out) k,
        real(kind=wp), dimension(*), intent(out) reig,
        real(kind=wp), dimension(*), intent(out) imeig,
        real(kind=wp), dimension(ldz,*), intent(out) z,
        integer, intent(in) ldz,
        real(kind=wp), dimension(*), intent(out) res,
        real(kind=wp), dimension(ldb,*), intent(out) b,
        integer, intent(in) ldb,
        real(kind=wp), dimension(ldw,*), intent(out) w,
        integer, intent(in) ldw,
        real(kind=wp), dimension(lds,*), intent(out) s,
        integer, intent(in) lds,
        real(kind=wp), dimension(*), intent(out) work,
        integer, intent(in) lwork,
        integer, dimension(*), intent(out) iwork,
        integer, intent(in) liwork,
        integer, intent(out) info
)
```

SGEDMD computes the Dynamic Mode Decomposition (DMD) for
a pair of data snapshot matrices. For the input matrices
X and Y such that Y = A\*X with an unaccessible matrix
A, SGEDMD computes a certain number of Ritz pairs of A using
the standard Rayleigh-Ritz extraction from a subspace of
range(X) that is determined using the leading left singular
vectors of X. Optionally, SGEDMD returns the residuals
of the computed Ritz pairs, the information needed for
a refinement of the Ritz vectors, or the eigenvectors of
the Exact DMD.
For further details see the references listed
below. For more details of the implementation see [3].

## Parameters
JOBS : JOBS (input) CHARACTER\*1 [in]
> Determines whether the initial data snapshots are scaled
> by a diagonal matrix.
> 'S' :: The data snapshots matrices X and Y are multiplied
> with a diagonal matrix D so that X\*D has unit
> nonzero columns (in the Euclidean 2-norm)
> 'C' :: The snapshots are scaled as with the 'S' option.
> If it is found that an i-th column of X is zero
> vector and the corresponding i-th column of Y is
> non-zero, then the i-th column of Y is set to
> zero and a warning flag is raised.
> 'Y' :: The data snapshots matrices X and Y are multiplied
> by a diagonal matrix D so that Y\*D has unit
> nonzero columns (in the Euclidean 2-norm)
> 'N' :: No data scaling.

JOBZ : JOBZ (input) CHARACTER\*1 [in]
> Determines whether the eigenvectors (Koopman modes) will
> be computed.
> 'V' :: The eigenvectors (Koopman modes) will be computed
> and returned in the matrix Z.
> See the description of Z.
> 'F' :: The eigenvectors (Koopman modes) will be returned
> in factored form as the product X(:,1:K)\*W, where X
> contains a POD basis (leading left singular vectors
> of the data matrix X) and W contains the eigenvectors
> of the corresponding Rayleigh quotient.
> See the descriptions of K, X, W, Z.
> 'N' :: The eigenvectors are not computed.

JOBR : JOBR (input) CHARACTER\*1 [in]
> Determines whether to compute the residuals.
> 'R' :: The residuals for the computed eigenpairs will be
> computed and stored in the array RES.
> See the description of RES.
> For this option to be legal, JOBZ must be 'V'.
> 'N' :: The residuals are not computed.

JOBF : JOBF (input) CHARACTER\*1 [in]
> Specifies whether to store information needed for post-
> processing (e.g. computing refined Ritz vectors)
> 'R' :: The matrix needed for the refinement of the Ritz
> vectors is computed and stored in the array B.
> See the description of B.
> 'E' :: The unscaled eigenvectors of the Exact DMD are
> computed and returned in the array B. See the
> description of B.
> 'N' :: No eigenvector refinement data is computed.

WHTSVD : WHTSVD (input) INTEGER, WHSTVD in { 1, 2, 3, 4 } [in]
> Allows for a selection of the SVD algorithm from the
> LAPACK library.
> 1 :: SGESVD (the QR SVD algorithm)
> 2 :: SGESDD (the Divide and Conquer algorithm; if enough
> workspace available, this is the fastest option)
> 3 :: SGESVDQ (the preconditioned QR SVD  ; this and 4
> are the most accurate options)
> 4 :: SGEJSV (the preconditioned Jacobi SVD; this and 3
> are the most accurate options)
> For the four methods above, a significant difference in
> the accuracy of small singular values is possible if
> the snapshots vary in norm so that X is severely
> ill-conditioned. If small (smaller than EPS\*||X||)
> singular values are of interest and JOBS=='N',  then
> the options (3, 4) give the most accurate results, where
> the option 4 is slightly better and with stronger
> theoretical background.
> If JOBS=='S', i.e. the columns of X will be normalized,
> then all methods give nearly equally accurate results.

M : M (input) INTEGER, M>= 0 [in]
> The state space dimension (the row dimension of X, Y).

N : N (input) INTEGER, 0 <= N <= M [in]
> The number of data snapshot pairs
> (the number of columns of X and Y).

X : X (input/output) REAL(KIND=WP) M-by-N array [in,out]
> > On entry, X contains the data snapshot matrix X. It is
> assumed that the column norms of X are in the range of
> the normalized floating point numbers.
> < On exit, the leading K columns of X contain a POD basis,
> i.e. the leading K left singular vectors of the input
> data matrix X, U(:,1:K). All N columns of X contain all
> left singular vectors of the input matrix X.
> See the descriptions of K, Z and W.

LDX : LDX (input) INTEGER, LDX >= M [in]
> The leading dimension of the array X.

Y : Y (input/workspace/output) REAL(KIND=WP) M-by-N array [in,out]
> > On entry, Y contains the data snapshot matrix Y
> < On exit,
> If JOBR == 'R', the leading K columns of Y  contain
> the residual vectors for the computed Ritz pairs.
> See the description of RES.
> If JOBR == 'N', Y contains the original input data,
> scaled according to the value of JOBS.

LDY : LDY (input) INTEGER , LDY >= M [in]
> The leading dimension of the array Y.

NRNK : NRNK (input) INTEGER [in]
> Determines the mode how to compute the numerical rank,
> i.e. how to truncate small singular values of the input
> matrix X. On input, if
> NRNK = -1 :: i-th singular value sigma(i) is truncated
> if sigma(i) <= TOL\*sigma(1)
> This option is recommended.
> NRNK = -2 :: i-th singular value sigma(i) is truncated
> if sigma(i) <= TOL\*sigma(i-1)
> This option is included for R&D purposes.
> It requires highly accurate SVD, which
> may not be feasible.
> The numerical rank can be enforced by using positive
> value of NRNK as follows:
> 0 < NRNK <= N :: at most NRNK largest singular values
> will be used. If the number of the computed nonzero
> singular values is less than NRNK, then only those
> nonzero values will be used and the actually used
> dimension is less than NRNK. The actual number of
> the nonzero singular values is returned in the variable
> K. See the descriptions of TOL and  K.

TOL : TOL (input) REAL(KIND=WP), 0 <= TOL < 1 [in]
> The tolerance for truncating small singular values.
> See the description of NRNK.

K : K (output) INTEGER,  0 <= K <= N [out]
> The dimension of the POD basis for the data snapshot
> matrix X and the number of the computed Ritz pairs.
> The value of K is determined according to the rule set
> by the parameters NRNK and TOL.
> See the descriptions of NRNK and TOL.

REIG : REIG (output) REAL(KIND=WP) N-by-1 array [out]
> The leading K (K<=N) entries of REIG contain
> the real parts of the computed eigenvalues
> REIG(1:K) + sqrt(-1)\*IMEIG(1:K).
> See the descriptions of K, IMEIG, and Z.

IMEIG : IMEIG (output) REAL(KIND=WP) N-by-1 array [out]
> The leading K (K<=N) entries of IMEIG contain
> the imaginary parts of the computed eigenvalues
> REIG(1:K) + sqrt(-1)\*IMEIG(1:K).
> The eigenvalues are determined as follows:
> If IMEIG(i) == 0, then the corresponding eigenvalue is
> real, LAMBDA(i) = REIG(i).
> If IMEIG(i)>0, then the corresponding complex
> conjugate pair of eigenvalues reads
> LAMBDA(i)   = REIG(i) + sqrt(-1)\*IMAG(i)
> LAMBDA(i+1) = REIG(i) - sqrt(-1)\*IMAG(i)
> That is, complex conjugate pairs have consecutive
> indices (i,i+1), with the positive imaginary part
> listed first.
> See the descriptions of K, REIG, and Z.

Z : Z (workspace/output) REAL(KIND=WP)  M-by-N array [out]
> If JOBZ =='V' then
> Z contains real Ritz vectors as follows:
> If IMEIG(i)=0, then Z(:,i) is an eigenvector of
> the i-th Ritz value; ||Z(:,i)||_2=1.
> If IMEIG(i) > 0 (and IMEIG(i+1) < 0) then
> [Z(:,i) Z(:,i+1)] span an invariant subspace and
> the Ritz values extracted from this subspace are
> REIG(i) + sqrt(-1)\*IMEIG(i) and
> REIG(i) - sqrt(-1)\*IMEIG(i).
> The corresponding eigenvectors are
> Z(:,i) + sqrt(-1)\*Z(:,i+1) and
> Z(:,i) - sqrt(-1)\*Z(:,i+1), respectively.
> || Z(:,i:i+1)||_F = 1.
> If JOBZ == 'F', then the above descriptions hold for
> the columns of X(:,1:K)\*W(1:K,1:K), where the columns
> of W(1:k,1:K) are the computed eigenvectors of the
> K-by-K Rayleigh quotient. The columns of W(1:K,1:K)
> are similarly structured: If IMEIG(i) == 0 then
> X(:,1:K)\*W(:,i) is an eigenvector, and if IMEIG(i)>0
> then X(:,1:K)\*W(:,i)+sqrt(-1)\*X(:,1:K)\*W(:,i+1) and
> X(:,1:K)\*W(:,i)-sqrt(-1)\*X(:,1:K)\*W(:,i+1)
> are the eigenvectors of LAMBDA(i), LAMBDA(i+1).
> See the descriptions of REIG, IMEIG, X and W.

LDZ : LDZ (input) INTEGER , LDZ >= M [in]
> The leading dimension of the array Z.

RES : RES (output) REAL(KIND=WP) N-by-1 array [out]
> RES(1:K) contains the residuals for the K computed
> Ritz pairs.
> If LAMBDA(i) is real, then
> RES(i) = || A \* Z(:,i) - LAMBDA(i)\*Z(:,i))||_2.
> If [LAMBDA(i), LAMBDA(i+1)] is a complex conjugate pair
> then
> RES(i)=RES(i+1) = || A \* Z(:,i:i+1) - Z(:,i:i+1) \*B||_F
> where B = [ real(LAMBDA(i)) imag(LAMBDA(i)) ]
> [-imag(LAMBDA(i)) real(LAMBDA(i)) ].
> It holds that
> RES(i)   = || A\*ZC(:,i)   - LAMBDA(i)  \*ZC(:,i)   ||_2
> RES(i+1) = || A\*ZC(:,i+1) - LAMBDA(i+1)\*ZC(:,i+1) ||_2
> where ZC(:,i)   =  Z(:,i) + sqrt(-1)\*Z(:,i+1)
> ZC(:,i+1) =  Z(:,i) - sqrt(-1)\*Z(:,i+1)
> See the description of REIG, IMEIG and Z.

B : B (output) REAL(KIND=WP)  M-by-N array. [out]
> IF JOBF =='R', B(1:M,1:K) contains A\*U(:,1:K), and can
> be used for computing the refined vectors; see further
> details in the provided references.
> If JOBF == 'E', B(1:M,1;K) contains
> A\*U(:,1:K)\*W(1:K,1:K), which are the vectors from the
> Exact DMD, up to scaling by the inverse eigenvalues.
> If JOBF =='N', then B is not referenced.
> See the descriptions of X, W, K.

LDB : LDB (input) INTEGER, LDB >= M [in]
> The leading dimension of the array B.

W : W (workspace/output) REAL(KIND=WP) N-by-N array [out]
> On exit, W(1:K,1:K) contains the K computed
> eigenvectors of the matrix Rayleigh quotient (real and
> imaginary parts for each complex conjugate pair of the
> eigenvalues). The Ritz vectors (returned in Z) are the
> product of X (containing a POD basis for the input
> matrix X) and W. See the descriptions of K, S, X and Z.
> W is also used as a workspace to temporarily store the
> left singular vectors of X.

LDW : LDW (input) INTEGER, LDW >= N [in]
> The leading dimension of the array W.

S : S (workspace/output) REAL(KIND=WP) N-by-N array [out]
> The array S(1:K,1:K) is used for the matrix Rayleigh
> quotient. This content is overwritten during
> the eigenvalue decomposition by SGEEV.
> See the description of K.

LDS : LDS (input) INTEGER, LDS >= N [in]
> The leading dimension of the array S.

WORK : WORK (workspace/output) REAL(KIND=WP) LWORK-by-1 array [out]
> On exit, WORK(1:N) contains the singular values of
> X (for JOBS=='N') or column scaled X (JOBS=='S', 'C').
> If WHTSVD==4, then WORK(N+1) and WORK(N+2) contain
> scaling factor WORK(N+2)/WORK(N+1) used to scale X
> and Y to avoid overflow in the SVD of X.
> This may be of interest if the scaling option is off
> and as many as possible smallest eigenvalues are
> desired to the highest feasible accuracy.
> If the call to SGEDMD is only workspace query, then
> WORK(1) contains the minimal workspace length and
> WORK(2) is the optimal workspace length. Hence, the
> length of work is at least 2.
> See the description of LWORK.

LWORK : LWORK (input) INTEGER [in]
> The minimal length of the workspace vector WORK.
> LWORK is calculated as follows:
> If WHTSVD == 1 ::
> If JOBZ == 'V', then
> LWORK >= MAX(2, N + LWORK_SVD, N+MAX(1,4\*N)).
> If JOBZ == 'N'  then
> LWORK >= MAX(2, N + LWORK_SVD, N+MAX(1,3\*N)).
> Here LWORK_SVD = MAX(1,3\*N+M,5\*N) is the minimal
> workspace length of SGESVD.
> If WHTSVD == 2 ::
> If JOBZ == 'V', then
> LWORK >= MAX(2, N + LWORK_SVD, N+MAX(1,4\*N))
> If JOBZ == 'N', then
> LWORK >= MAX(2, N + LWORK_SVD, N+MAX(1,3\*N))
> Here LWORK_SVD = MAX(M, 5\*N\*N+4\*N)+3\*N\*N is the
> minimal workspace length of SGESDD.
> If WHTSVD == 3 ::
> If JOBZ == 'V', then
> LWORK >= MAX(2, N+LWORK_SVD,N+MAX(1,4\*N))
> If JOBZ == 'N', then
> LWORK >= MAX(2, N+LWORK_SVD,N+MAX(1,3\*N))
> Here LWORK_SVD = N+M+MAX(3\*N+1,
> MAX(1,3\*N+M,5\*N),MAX(1,N))
> is the minimal workspace length of SGESVDQ.
> If WHTSVD == 4 ::
> If JOBZ == 'V', then
> LWORK >= MAX(2, N+LWORK_SVD,N+MAX(1,4\*N))
> If JOBZ == 'N', then
> LWORK >= MAX(2, N+LWORK_SVD,N+MAX(1,3\*N))
> Here LWORK_SVD = MAX(7,2\*M+N,6\*N+2\*N\*N) is the
> minimal workspace length of SGEJSV.
> The above expressions are not simplified in order to
> make the usage of WORK more transparent, and for
> easier checking. In any case, LWORK >= 2.
> If on entry LWORK = -1, then a workspace query is
> assumed and the procedure only computes the minimal
> and the optimal workspace lengths for both WORK and
> IWORK. See the descriptions of WORK and IWORK.

IWORK : IWORK (workspace/output) INTEGER LIWORK-by-1 array [out]
> Workspace that is required only if WHTSVD equals
> 2 , 3 or 4. (See the description of WHTSVD).
> If on entry LWORK =-1 or LIWORK=-1, then the
> minimal length of IWORK is computed and returned in
> IWORK(1). See the description of LIWORK.

LIWORK : LIWORK (input) INTEGER [in]
> The minimal length of the workspace vector IWORK.
> If WHTSVD == 1, then only IWORK(1) is used; LIWORK >=1
> If WHTSVD == 2, then LIWORK >= MAX(1,8\*MIN(M,N))
> If WHTSVD == 3, then LIWORK >= MAX(1,M+N-1)
> If WHTSVD == 4, then LIWORK >= MAX(3,M+3\*N)
> If on entry LIWORK = -1, then a workspace query is
> assumed and the procedure only computes the minimal
> and the optimal workspace lengths for both WORK and
> IWORK. See the descriptions of WORK and IWORK.

INFO : INFO (output) INTEGER [out]
> -i < 0 :: On entry, the i-th argument had an
> illegal value
> = 0 :: Successful return.
> = 1 :: Void input. Quick exit (M=0 or N=0).
> = 2 :: The SVD computation of X did not converge.
> Suggestion: Check the input data and/or
> repeat with different WHTSVD.
> = 3 :: The computation of the eigenvalues did not
> converge.
> = 4 :: If data scaling was requested on input and
> the procedure found inconsistency in the data
> such that for some column index i,
> X(:,i) = 0 but Y(:,i) /= 0, then Y(:,i) is set
> to zero if JOBS=='C'. The computation proceeds
> with original or modified data and warning
> flag is set with INFO=4.
