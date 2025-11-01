```fortran
subroutine zgedmd (
        character, intent(in) jobs,
        character, intent(in) jobz,
        character, intent(in) jobr,
        character, intent(in) jobf,
        integer, intent(in) whtsvd,
        integer, intent(in) m,
        integer, intent(in) n,
        complex(kind=wp), dimension(ldx,*), intent(inout) x,
        integer, intent(in) ldx,
        complex(kind=wp), dimension(ldy,*), intent(inout) y,
        integer, intent(in) ldy,
        integer, intent(in) nrnk,
        real(kind=wp), intent(in) tol,
        integer, intent(out) k,
        complex(kind=wp), dimension(*), intent(out) eigs,
        complex(kind=wp), dimension(ldz,*), intent(out) z,
        integer, intent(in) ldz,
        real(kind=wp), dimension(*), intent(out) res,
        complex(kind=wp), dimension(ldb,*), intent(out) b,
        integer, intent(in) ldb,
        complex(kind=wp), dimension(ldw,*), intent(out) w,
        integer, intent(in) ldw,
        complex(kind=wp), dimension(lds,*), intent(out) s,
        integer, intent(in) lds,
        complex(kind=wp), dimension(*), intent(out) zwork,
        integer, intent(in) lzwork,
        real(kind=wp), dimension(*), intent(out) rwork,
        integer, intent(in) lrwork,
        integer, dimension(*), intent(out) iwork,
        integer, intent(in) liwork,
        integer, intent(out) info
)
```

ZGEDMD computes the Dynamic Mode Decomposition (DMD) for
a pair of data snapshot matrices. For the input matrices
X and Y such that Y = A\*X with an unaccessible matrix
A, ZGEDMD computes a certain number of Ritz pairs of A using
the standard Rayleigh-Ritz extraction from a subspace of
range(X) that is determined using the leading left singular
vectors of X. Optionally, ZGEDMD returns the residuals
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
> 1 :: ZGESVD (the QR SVD algorithm)
> 2 :: ZGESDD (the Divide and Conquer algorithm; if enough
> workspace available, this is the fastest option)
> 3 :: ZGESVDQ (the preconditioned QR SVD  ; this and 4
> are the most accurate options)
> 4 :: ZGEJSV (the preconditioned Jacobi SVD; this and 3
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

X : X (input/output) COMPLEX(KIND=WP) M-by-N array [in,out]
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

Y : Y (input/workspace/output) COMPLEX(KIND=WP) M-by-N array [in,out]
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

EIGS : EIGS (output) COMPLEX(KIND=WP) N-by-1 array [out]
> The leading K (K<=N) entries of EIGS contain
> the computed eigenvalues (Ritz values).
> See the descriptions of K, and Z.

Z : Z (workspace/output) COMPLEX(KIND=WP)  M-by-N array [out]
> If JOBZ =='V' then Z contains the  Ritz vectors.  Z(:,i)
> is an eigenvector of the i-th Ritz value; ||Z(:,i)||_2=1.
> If JOBZ == 'F', then the Z(:,i)'s are given implicitly as
> the columns of X(:,1:K)\*W(1:K,1:K), i.e. X(:,1:K)\*W(:,i)
> is an eigenvector corresponding to EIGS(i). The columns
> of W(1:k,1:K) are the computed eigenvectors of the
> K-by-K Rayleigh quotient.
> See the descriptions of EIGS, X and W.

LDZ : LDZ (input) INTEGER , LDZ >= M [in]
> The leading dimension of the array Z.

RES : RES (output) REAL(KIND=WP) N-by-1 array [out]
> RES(1:K) contains the residuals for the K computed
> Ritz pairs,
> RES(i) = || A \* Z(:,i) - EIGS(i)\*Z(:,i))||_2.
> See the description of EIGS and Z.

B : B (output) COMPLEX(KIND=WP)  M-by-N array. [out]
> IF JOBF =='R', B(1:M,1:K) contains A\*U(:,1:K), and can
> be used for computing the refined vectors; see further
> details in the provided references.
> If JOBF == 'E', B(1:M,1:K) contains
> A\*U(:,1:K)\*W(1:K,1:K), which are the vectors from the
> Exact DMD, up to scaling by the inverse eigenvalues.
> If JOBF =='N', then B is not referenced.
> See the descriptions of X, W, K.

LDB : LDB (input) INTEGER, LDB >= M [in]
> The leading dimension of the array B.

W : W (workspace/output) COMPLEX(KIND=WP) N-by-N array [out]
> On exit, W(1:K,1:K) contains the K computed
> eigenvectors of the matrix Rayleigh quotient.
> The Ritz vectors (returned in Z) are the
> product of X (containing a POD basis for the input
> matrix X) and W. See the descriptions of K, S, X and Z.
> W is also used as a workspace to temporarily store the
> right singular vectors of X.

LDW : LDW (input) INTEGER, LDW >= N [in]
> The leading dimension of the array W.

S : S (workspace/output) COMPLEX(KIND=WP) N-by-N array [out]
> The array S(1:K,1:K) is used for the matrix Rayleigh
> quotient. This content is overwritten during
> the eigenvalue decomposition by ZGEEV.
> See the description of K.

LDS : LDS (input) INTEGER, LDS >= N [in]
> The leading dimension of the array S.

ZWORK : ZWORK (workspace/output) COMPLEX(KIND=WP) LZWORK-by-1 array [out]
> ZWORK is used as complex workspace in the complex SVD, as
> specified by WHTSVD (1,2, 3 or 4) and for ZGEEV for computing
> the eigenvalues of a Rayleigh quotient.
> If the call to ZGEDMD is only workspace query, then
> ZWORK(1) contains the minimal complex workspace length and
> ZWORK(2) is the optimal complex workspace length.
> Hence, the length of work is at least 2.
> See the description of LZWORK.

LZWORK : LZWORK (input) INTEGER [in]
> The minimal length of the workspace vector ZWORK.
> LZWORK is calculated as MAX(LZWORK_SVD, LZWORK_ZGEEV),
> where LZWORK_ZGEEV = MAX( 1, 2\*N )  and the minimal
> LZWORK_SVD is calculated as follows
> If WHTSVD == 1 :: ZGESVD ::
> LZWORK_SVD = MAX(1,2\*MIN(M,N)+MAX(M,N))
> If WHTSVD == 2 :: ZGESDD ::
> LZWORK_SVD = 2\*MIN(M,N)\*MIN(M,N)+2\*MIN(M,N)+MAX(M,N)
> If WHTSVD == 3 :: ZGESVDQ ::
> LZWORK_SVD = obtainable by a query
> If WHTSVD == 4 :: ZGEJSV ::
> LZWORK_SVD = obtainable by a query
> If on entry LZWORK = -1, then a workspace query is
> assumed and the procedure only computes the minimal
> and the optimal workspace lengths and returns them in
> LZWORK(1) and LZWORK(2), respectively.

RWORK : RWORK (workspace/output) REAL(KIND=WP) LRWORK-by-1 array [out]
> On exit, RWORK(1:N) contains the singular values of
> X (for JOBS=='N') or column scaled X (JOBS=='S', 'C').
> If WHTSVD==4, then RWORK(N+1) and RWORK(N+2) contain
> scaling factor RWORK(N+2)/RWORK(N+1) used to scale X
> and Y to avoid overflow in the SVD of X.
> This may be of interest if the scaling option is off
> and as many as possible smallest eigenvalues are
> desired to the highest feasible accuracy.
> If the call to ZGEDMD is only workspace query, then
> RWORK(1) contains the minimal workspace length.
> See the description of LRWORK.

LRWORK : LRWORK (input) INTEGER [in]
> The minimal length of the workspace vector RWORK.
> LRWORK is calculated as follows:
> LRWORK = MAX(1, N+LRWORK_SVD,N+LRWORK_ZGEEV), where
> LRWORK_ZGEEV = MAX(1,2\*N) and RWORK_SVD is the real workspace
> for the SVD subroutine determined by the input parameter
> WHTSVD.
> If WHTSVD == 1 :: ZGESVD ::
> LRWORK_SVD = 5\*MIN(M,N)
> If WHTSVD == 2 :: ZGESDD ::
> LRWORK_SVD =  MAX(5\*MIN(M,N)\*MIN(M,N)+7\*MIN(M,N),
> 2\*MAX(M,N)\*MIN(M,N)+2\*MIN(M,N)\*MIN(M,N)+MIN(M,N) ) )
> If WHTSVD == 3 :: ZGESVDQ ::
> LRWORK_SVD = obtainable by a query
> If WHTSVD == 4 :: ZGEJSV ::
> LRWORK_SVD = obtainable by a query
> If on entry LRWORK = -1, then a workspace query is
> assumed and the procedure only computes the minimal
> real workspace length and returns it in RWORK(1).

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
> and the optimal workspace lengths for  ZWORK, RWORK and
> IWORK. See the descriptions of ZWORK, RWORK and IWORK.

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
