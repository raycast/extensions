```fortran
subroutine zggesx (
        character jobvsl,
        character jobvsr,
        character sort,
        external selctg,
        character sense,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        integer sdim,
        complex*16, dimension( * ) alpha,
        complex*16, dimension( * ) beta,
        complex*16, dimension( ldvsl, * ) vsl,
        integer ldvsl,
        complex*16, dimension( ldvsr, * ) vsr,
        integer ldvsr,
        double precision, dimension( 2 ) rconde,
        double precision, dimension( 2 ) rcondv,
        complex*16, dimension( * ) work,
        integer lwork,
        double precision, dimension( * ) rwork,
        integer, dimension( * ) iwork,
        integer liwork,
        logical, dimension( * ) bwork,
        integer info
)
```

ZGGESX computes for a pair of N-by-N complex nonsymmetric matrices
(A,B), the generalized eigenvalues, the complex Schur form (S,T),
and, optionally, the left and/or right matrices of Schur vectors (VSL
and VSR).  This gives the generalized Schur factorization

(A,B) = ( (VSL) S (VSR)\*\*H, (VSL) T (VSR)\*\*H )

where (VSR)\*\*H is the conjugate-transpose of VSR.

Optionally, it also orders the eigenvalues so that a selected cluster
of eigenvalues appears in the leading diagonal blocks of the upper
triangular matrix S and the upper triangular matrix T; computes
a reciprocal condition number for the average of the selected
eigenvalues (RCONDE); and computes a reciprocal condition number for
the right and left deflating subspaces corresponding to the selected
eigenvalues (RCONDV). The leading columns of VSL and VSR then form
an orthonormal basis for the corresponding left and right eigenspaces
(deflating subspaces).

A generalized eigenvalue for a pair of matrices (A,B) is a scalar w
or a ratio alpha/beta = w, such that  A - w\*B is singular.  It is
usually represented as the pair (alpha,beta), as there is a
reasonable interpretation for beta=0 or for both being zero.

A pair of matrices (S,T) is in generalized complex Schur form if T is
upper triangular with non-negative diagonal and S is upper
triangular.

## Parameters
JOBVSL : CHARACTER\*1 [in]
> = 'N':  do not compute the left Schur vectors;
> = 'V':  compute the left Schur vectors.

JOBVSR : CHARACTER\*1 [in]
> = 'N':  do not compute the right Schur vectors;
> = 'V':  compute the right Schur vectors.

SORT : CHARACTER\*1 [in]
> Specifies whether or not to order the eigenvalues on the
> diagonal of the generalized Schur form.
> = 'N':  Eigenvalues are not ordered;
> = 'S':  Eigenvalues are ordered (see SELCTG).

SELCTG : a LOGICAL FUNCTION of two COMPLEX\*16 arguments [in]
> SELCTG must be declared EXTERNAL in the calling subroutine.
> If SORT = 'N', SELCTG is not referenced.
> If SORT = 'S', SELCTG is used to select eigenvalues to sort
> to the top left of the Schur form.
> Note that a selected complex eigenvalue may no longer satisfy
> SELCTG(ALPHA(j),BETA(j)) = .TRUE. after ordering, since
> ordering may change the value of complex eigenvalues
> (especially if the eigenvalue is ill-conditioned), in this
> case INFO is set to N+3 see INFO below).

SENSE : CHARACTER\*1 [in]
> Determines which reciprocal condition numbers are computed.
> = 'N': None are computed;
> = 'E': Computed for average of selected eigenvalues only;
> = 'V': Computed for selected deflating subspaces only;
> = 'B': Computed for both.
> If SENSE = 'E', 'V', or 'B', SORT must equal 'S'.

N : INTEGER [in]
> The order of the matrices A, B, VSL, and VSR.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA, N) [in,out]
> On entry, the first of the pair of matrices.
> On exit, A has been overwritten by its generalized Schur
> form S.

LDA : INTEGER [in]
> The leading dimension of A.  LDA >= max(1,N).

B : COMPLEX\*16 array, dimension (LDB, N) [in,out]
> On entry, the second of the pair of matrices.
> On exit, B has been overwritten by its generalized Schur
> form T.

LDB : INTEGER [in]
> The leading dimension of B.  LDB >= max(1,N).

SDIM : INTEGER [out]
> If SORT = 'N', SDIM = 0.
> If SORT = 'S', SDIM = number of eigenvalues (after sorting)
> for which SELCTG is true.

ALPHA : COMPLEX\*16 array, dimension (N) [out]

BETA : COMPLEX\*16 array, dimension (N) [out]
> On exit, ALPHA(j)/BETA(j), j=1,...,N, will be the
> generalized eigenvalues.  ALPHA(j) and BETA(j),j=1,...,N  are
> the diagonals of the complex Schur form (S,T).  BETA(j) will
> be non-negative real.
> 
> Note: the quotients ALPHA(j)/BETA(j) may easily over- or
> underflow, and BETA(j) may even be zero.  Thus, the user
> should avoid naively computing the ratio alpha/beta.
> However, ALPHA will be always less than and usually
> comparable with norm(A) in magnitude, and BETA always less
> than and usually comparable with norm(B).

VSL : COMPLEX\*16 array, dimension (LDVSL,N) [out]
> If JOBVSL = 'V', VSL will contain the left Schur vectors.
> Not referenced if JOBVSL = 'N'.

LDVSL : INTEGER [in]
> The leading dimension of the matrix VSL. LDVSL >=1, and
> if JOBVSL = 'V', LDVSL >= N.

VSR : COMPLEX\*16 array, dimension (LDVSR,N) [out]
> If JOBVSR = 'V', VSR will contain the right Schur vectors.
> Not referenced if JOBVSR = 'N'.

LDVSR : INTEGER [in]
> The leading dimension of the matrix VSR. LDVSR >= 1, and
> if JOBVSR = 'V', LDVSR >= N.

RCONDE : DOUBLE PRECISION array, dimension ( 2 ) [out]
> If SENSE = 'E' or 'B', RCONDE(1) and RCONDE(2) contain the
> reciprocal condition numbers for the average of the selected
> eigenvalues.
> Not referenced if SENSE = 'N' or 'V'.

RCONDV : DOUBLE PRECISION array, dimension ( 2 ) [out]
> If SENSE = 'V' or 'B', RCONDV(1) and RCONDV(2) contain the
> reciprocal condition number for the selected deflating
> subspaces.
> Not referenced if SENSE = 'N' or 'E'.

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If N = 0, LWORK >= 1, else if SENSE = 'E', 'V', or 'B',
> LWORK >= MAX(1,2\*N,2\*SDIM\*(N-SDIM)), else
> LWORK >= MAX(1,2\*N).  Note that 2\*SDIM\*(N-SDIM) <= N\*N/2.
> Note also that an error is only returned if
> LWORK < MAX(1,2\*N), but if SENSE = 'E' or 'V' or 'B' this may
> not be large enough.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the bound on the optimal size of the WORK
> array and the minimum size of the IWORK array, returns these
> values as the first entries of the WORK and IWORK arrays, and
> no error message related to LWORK or LIWORK is issued by
> XERBLA.

RWORK : DOUBLE PRECISION array, dimension ( 8\*N ) [out]
> Real workspace.

IWORK : INTEGER array, dimension (MAX(1,LIWORK)) [out]
> On exit, if INFO = 0, IWORK(1) returns the minimum LIWORK.

LIWORK : INTEGER [in]
> The dimension of the array IWORK.
> If SENSE = 'N' or N = 0, LIWORK >= 1, otherwise
> LIWORK >= N+2.
> 
> If LIWORK = -1, then a workspace query is assumed; the
> routine only calculates the bound on the optimal size of the
> WORK array and the minimum size of the IWORK array, returns
> these values as the first entries of the WORK and IWORK
> arrays, and no error message related to LWORK or LIWORK is
> issued by XERBLA.

BWORK : LOGICAL array, dimension (N) [out]
> Not referenced if SORT = 'N'.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> = 1,...,N:
> The QZ iteration failed.  (A,B) are not in Schur
> form, but ALPHA(j) and BETA(j) should be correct for
> j=INFO+1,...,N.
> > N:  =N+1: other than QZ iteration failed in ZHGEQZ
> =N+2: after reordering, roundoff changed values of
> some complex eigenvalues so that leading
> eigenvalues in the Generalized Schur form no
> longer satisfy SELCTG=.TRUE.  This could also
> be caused due to scaling.
> =N+3: reordering failed in ZTGSEN.
