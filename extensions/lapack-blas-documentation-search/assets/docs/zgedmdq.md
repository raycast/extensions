```fortran
subroutine zgedmdq (
        character, intent(in) jobs,
        character, intent(in) jobz,
        character, intent(in) jobr,
        character, intent(in) jobq,
        character, intent(in) jobt,
        character, intent(in) jobf,
        integer, intent(in) whtsvd,
        integer, intent(in) m,
        integer, intent(in) n,
        complex(kind=wp), dimension(ldf,*), intent(inout) f,
        integer, intent(in) ldf,
        complex(kind=wp), dimension(ldx,*), intent(out) x,
        integer, intent(in) ldx,
        complex(kind=wp), dimension(ldy,*), intent(out) y,
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
        complex(kind=wp), dimension(ldv,*), intent(out) v,
        integer, intent(in) ldv,
        complex(kind=wp), dimension(lds,*), intent(out) s,
        integer, intent(in) lds,
        complex(kind=wp), dimension(*), intent(out) zwork,
        integer, intent(in) lzwork,
        real(kind=wp), dimension(*), intent(out) work,
        integer, intent(in) lwork,
        integer, dimension(*), intent(out) iwork,
        integer, intent(in) liwork,
        integer, intent(out) info
)
```

ZGEDMDQ computes the Dynamic Mode Decomposition (DMD) for
a pair of data snapshot matrices, using a QR factorization
based compression of the data. For the input matrices
X and Y such that Y = A\*X with an unaccessible matrix
A, ZGEDMDQ computes a certain number of Ritz pairs of A using
the standard Rayleigh-Ritz extraction from a subspace of
range(X) that is determined using the leading left singular
vectors of X. Optionally, ZGEDMDQ returns the residuals
of the computed Ritz pairs, the information needed for
a refinement of the Ritz vectors, or the eigenvectors of
the Exact DMD.
For further details see the references listed
below. For more details of the implementation see [3].

## Parameters
JOBS : JOBS (input) CHARACTER\*1 [in]
> Determines whether the initial data snapshots are scaled
> by a diagonal matrix. The data snapshots are the columns
> of F. The leading N-1 columns of F are denoted X and the
> trailing N-1 columns are denoted Y.
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
> in factored form as the product Z\*V, where Z
> is orthonormal and V contains the eigenvectors
> of the corresponding Rayleigh quotient.
> See the descriptions of F, V, Z.
> 'Q' :: The eigenvectors (Koopman modes) will be returned
> in factored form as the product Q\*Z, where Z
> contains the eigenvectors of the compression of the
> underlying discretized operator onto the span of
> the data snapshots. See the descriptions of F, V, Z.
> Q is from the initial QR factorization.
> 'N' :: The eigenvectors are not computed.

JOBR : JOBR (input) CHARACTER\*1 [in]
> Determines whether to compute the residuals.
> 'R' :: The residuals for the computed eigenpairs will
> be computed and stored in the array RES.
> See the description of RES.
> For this option to be legal, JOBZ must be 'V'.
> 'N' :: The residuals are not computed.

JOBQ : JOBQ (input) CHARACTER\*1 [in]
> Specifies whether to explicitly compute and return the
> unitary matrix from the QR factorization.
> 'Q' :: The matrix Q of the QR factorization of the data
> snapshot matrix is computed and stored in the
> array F. See the description of F.
> 'N' :: The matrix Q is not explicitly computed.

JOBT : JOBT (input) CHARACTER\*1 [in]
> Specifies whether to return the upper triangular factor
> from the QR factorization.
> 'R' :: The matrix R of the QR factorization of the data
> snapshot matrix F is returned in the array Y.
> See the description of Y and Further details.
> 'N' :: The matrix R is not returned.

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
> To be useful on exit, this option needs JOBQ='Q'.

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

M : M (input) INTEGER, M >= 0 [in]
> The state space dimension (the number of rows of F).

N : N (input) INTEGER, 0 <= N <= M [in]
> The number of data snapshots from a single trajectory,
> taken at equidistant discrete times. This is the
> number of columns of F.

F : F (input/output) COMPLEX(KIND=WP) M-by-N array [in,out]
> > On entry,
> the columns of F are the sequence of data snapshots
> from a single trajectory, taken at equidistant discrete
> times. It is assumed that the column norms of F are
> in the range of the normalized floating point numbers.
> < On exit,
> If JOBQ == 'Q', the array F contains the orthogonal
> matrix/factor of the QR factorization of the initial
> data snapshots matrix F. See the description of JOBQ.
> If JOBQ == 'N', the entries in F strictly below the main
> diagonal contain, column-wise, the information on the
> Householder vectors, as returned by ZGEQRF. The
> remaining information to restore the orthogonal matrix
> of the initial QR factorization is stored in ZWORK(1:MIN(M,N)).
> See the description of ZWORK.

LDF : LDF (input) INTEGER, LDF >= M [in]
> The leading dimension of the array F.

X : X (workspace/output) COMPLEX(KIND=WP) MIN(M,N)-by-(N-1) array [in,out]
> X is used as workspace to hold representations of the
> leading N-1 snapshots in the orthonormal basis computed
> in the QR factorization of F.
> On exit, the leading K columns of X contain the leading
> K left singular vectors of the above described content
> of X. To lift them to the space of the left singular
> vectors U(:,1:K) of the input data, pre-multiply with the
> Q factor from the initial QR factorization.
> See the descriptions of F, K, V  and Z.

LDX : LDX (input) INTEGER, LDX >= N [in]
> The leading dimension of the array X.

Y : Y (workspace/output) COMPLEX(KIND=WP) MIN(M,N)-by-(N) array [in,out]
> Y is used as workspace to hold representations of the
> trailing N-1 snapshots in the orthonormal basis computed
> in the QR factorization of F.
> On exit,
> If JOBT == 'R', Y contains the MIN(M,N)-by-N upper
> triangular factor from the QR factorization of the data
> snapshot matrix F.

LDY : LDY (input) INTEGER , LDY >= N [in]
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
> 0 < NRNK <= N-1 :: at most NRNK largest singular values
> will be used. If the number of the computed nonzero
> singular values is less than NRNK, then only those
> nonzero values will be used and the actually used
> dimension is less than NRNK. The actual number of
> the nonzero singular values is returned in the variable
> K. See the description of K.

TOL : TOL (input) REAL(KIND=WP), 0 <= TOL < 1 [in]
> The tolerance for truncating small singular values.
> See the description of NRNK.

K : K (output) INTEGER,  0 <= K <= N [out]
> The dimension of the SVD/POD basis for the leading N-1
> data snapshots (columns of F) and the number of the
> computed Ritz pairs. The value of K is determined
> according to the rule set by the parameters NRNK and
> TOL. See the descriptions of NRNK and TOL.

EIGS : EIGS (output) COMPLEX(KIND=WP) (N-1)-by-1 array [out]
> The leading K (K<=N-1) entries of EIGS contain
> the computed eigenvalues (Ritz values).
> See the descriptions of K, and Z.

Z : Z (workspace/output) COMPLEX(KIND=WP)  M-by-(N-1) array [out]
> If JOBZ =='V' then Z contains the Ritz vectors. Z(:,i)
> is an eigenvector of the i-th Ritz value; ||Z(:,i)||_2=1.
> If JOBZ == 'F', then the Z(:,i)'s are given implicitly as
> Z\*V, where Z contains orthonormal matrix (the product of
> Q from the initial QR factorization and the SVD/POD_basis
> returned by ZGEDMD in X) and the second factor (the
> eigenvectors of the Rayleigh quotient) is in the array V,
> as returned by ZGEDMD. That is,  X(:,1:K)\*V(:,i)
> is an eigenvector corresponding to EIGS(i). The columns
> of V(1:K,1:K) are the computed eigenvectors of the
> K-by-K Rayleigh quotient.
> See the descriptions of EIGS, X and V.

LDZ : LDZ (input) INTEGER , LDZ >= M [in]
> The leading dimension of the array Z.

RES : RES (output) REAL(KIND=WP) (N-1)-by-1 array [out]
> RES(1:K) contains the residuals for the K computed
> Ritz pairs,
> RES(i) = || A \* Z(:,i) - EIGS(i)\*Z(:,i))||_2.
> See the description of EIGS and Z.

B : B (output) COMPLEX(KIND=WP)  MIN(M,N)-by-(N-1) array. [out]
> IF JOBF =='R', B(1:N,1:K) contains A\*U(:,1:K), and can
> be used for computing the refined vectors; see further
> details in the provided references.
> If JOBF == 'E', B(1:N,1;K) contains
> A\*U(:,1:K)\*W(1:K,1:K), which are the vectors from the
> Exact DMD, up to scaling by the inverse eigenvalues.
> In both cases, the content of B can be lifted to the
> original dimension of the input data by pre-multiplying
> with the Q factor from the initial QR factorization.
> Here A denotes a compression of the underlying operator.
> See the descriptions of F and X.
> If JOBF =='N', then B is not referenced.

LDB : LDB (input) INTEGER, LDB >= MIN(M,N) [in]
> The leading dimension of the array B.

V : V (workspace/output) COMPLEX(KIND=WP) (N-1)-by-(N-1) array [out]
> On exit, V(1:K,1:K) V contains the K eigenvectors of
> the Rayleigh quotient. The Ritz vectors
> (returned in Z) are the product of Q from the initial QR
> factorization (see the description of F) X (see the
> description of X) and V.

LDV : LDV (input) INTEGER, LDV >= N-1 [in]
> The leading dimension of the array V.

S : S (output) COMPLEX(KIND=WP) (N-1)-by-(N-1) array [out]
> The array S(1:K,1:K) is used for the matrix Rayleigh
> quotient. This content is overwritten during
> the eigenvalue decomposition by ZGEEV.
> See the description of K.

LDS : LDS (input) INTEGER, LDS >= N-1 [in]
> The leading dimension of the array S.

ZWORK : ZWORK (workspace/output) COMPLEX(KIND=WP) LWORK-by-1 array [out]
> On exit,
> ZWORK(1:MIN(M,N)) contains the scalar factors of the
> elementary reflectors as returned by ZGEQRF of the
> M-by-N input matrix F.
> If the call to ZGEDMDQ is only workspace query, then
> ZWORK(1) contains the minimal complex workspace length and
> ZWORK(2) is the optimal complex workspace length.
> Hence, the length of work is at least 2.
> See the description of LZWORK.

LZWORK : LZWORK (input) INTEGER [in]
> The minimal length of the  workspace vector ZWORK.
> LZWORK is calculated as follows:
> Let MLWQR  = N (minimal workspace for ZGEQRF[M,N])
> MLWDMD = minimal workspace for ZGEDMD (see the
> description of LWORK in ZGEDMD)
> MLWMQR = N (minimal workspace for
> ZUNMQR['L','N',M,N,N])
> MLWGQR = N (minimal workspace for ZUNGQR[M,N,N])
> MINMN  = MIN(M,N)
> Then
> LZWORK = MAX(2, MIN(M,N)+MLWQR, MINMN+MLWDMD)
> is further updated as follows:
> if   JOBZ == 'V' or JOBZ == 'F' THEN
> LZWORK = MAX(LZWORK, MINMN+MLWMQR)
> if   JOBQ == 'Q' THEN
> LZWORK = MAX(ZLWORK, MINMN+MLWGQR)

WORK : WORK (workspace/output) REAL(KIND=WP) LWORK-by-1 array [out]
> On exit,
> WORK(1:N-1) contains the singular values of
> the input submatrix F(1:M,1:N-1).
> If the call to ZGEDMDQ is only workspace query, then
> WORK(1) contains the minimal workspace length and
> WORK(2) is the optimal workspace length. hence, the
> length of work is at least 2.
> See the description of LWORK.

LWORK : LWORK (input) INTEGER [in]
> The minimal length of the  workspace vector WORK.
> LWORK is the same as in ZGEDMD, because in ZGEDMDQ
> only ZGEDMD requires real workspace for snapshots
> of dimensions MIN(M,N)-by-(N-1).
> If on entry LWORK = -1, then a workspace query is
> assumed and the procedure only computes the minimal
> and the optimal workspace length for WORK.

IWORK : IWORK (workspace/output) INTEGER LIWORK-by-1 array [out]
> Workspace that is required only if WHTSVD equals
> 2 , 3 or 4. (See the description of WHTSVD).
> If on entry LWORK =-1 or LIWORK=-1, then the
> minimal length of IWORK is computed and returned in
> IWORK(1). See the description of LIWORK.

LIWORK : LIWORK (input) INTEGER [in]
> The minimal length of the workspace vector IWORK.
> If WHTSVD == 1, then only IWORK(1) is used; LIWORK >=1
> Let M1=MIN(M,N), N1=N-1. Then
> If WHTSVD == 2, then LIWORK >= MAX(1,8\*MIN(M1,N1))
> If WHTSVD == 3, then LIWORK >= MAX(1,M1+N1-1)
> If WHTSVD == 4, then LIWORK >= MAX(3,M1+3\*N1)
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
