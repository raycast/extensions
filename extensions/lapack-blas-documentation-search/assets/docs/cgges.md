```fortran
subroutine cgges (
        character jobvsl,
        character jobvsr,
        character sort,
        external selctg,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldb, * ) b,
        integer ldb,
        integer sdim,
        complex, dimension( * ) alpha,
        complex, dimension( * ) beta,
        complex, dimension( ldvsl, * ) vsl,
        integer ldvsl,
        complex, dimension( ldvsr, * ) vsr,
        integer ldvsr,
        complex, dimension( * ) work,
        integer lwork,
        real, dimension( * ) rwork,
        logical, dimension( * ) bwork,
        integer info
)
```

CGGES computes for a pair of N-by-N complex nonsymmetric matrices
(A,B), the generalized eigenvalues, the generalized complex Schur
form (S, T), and optionally left and/or right Schur vectors (VSL
and VSR). This gives the generalized Schur factorization

(A,B) = ( (VSL)\*S\*(VSR)\*\*H, (VSL)\*T\*(VSR)\*\*H )

where (VSR)\*\*H is the conjugate-transpose of VSR.

Optionally, it also orders the eigenvalues so that a selected cluster
of eigenvalues appears in the leading diagonal blocks of the upper
triangular matrix S and the upper triangular matrix T. The leading
columns of VSL and VSR then form an unitary basis for the
corresponding left and right eigenspaces (deflating subspaces).

(If only the generalized eigenvalues are needed, use the driver
CGGEV instead, which is faster.)

A generalized eigenvalue for a pair of matrices (A,B) is a scalar w
or a ratio alpha/beta = w, such that  A - w\*B is singular.  It is
usually represented as the pair (alpha,beta), as there is a
reasonable interpretation for beta=0, and even for both being zero.

A pair of matrices (S,T) is in generalized complex Schur form if S
and T are upper triangular and, in addition, the diagonal elements
of T are non-negative real numbers.

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

SELCTG : a LOGICAL FUNCTION of two COMPLEX arguments [in]
> SELCTG must be declared EXTERNAL in the calling subroutine.
> If SORT = 'N', SELCTG is not referenced.
> If SORT = 'S', SELCTG is used to select eigenvalues to sort
> to the top left of the Schur form.
> An eigenvalue ALPHA(j)/BETA(j) is selected if
> SELCTG(ALPHA(j),BETA(j)) is true.
> 
> Note that a selected complex eigenvalue may no longer satisfy
> SELCTG(ALPHA(j),BETA(j)) = .TRUE. after ordering, since
> ordering may change the value of complex eigenvalues
> (especially if the eigenvalue is ill-conditioned), in this
> case INFO is set to N+2 (See INFO below).

N : INTEGER [in]
> The order of the matrices A, B, VSL, and VSR.  N >= 0.

A : COMPLEX array, dimension (LDA, N) [in,out]
> On entry, the first of the pair of matrices.
> On exit, A has been overwritten by its generalized Schur
> form S.

LDA : INTEGER [in]
> The leading dimension of A.  LDA >= max(1,N).

B : COMPLEX array, dimension (LDB, N) [in,out]
> On entry, the second of the pair of matrices.
> On exit, B has been overwritten by its generalized Schur
> form T.

LDB : INTEGER [in]
> The leading dimension of B.  LDB >= max(1,N).

SDIM : INTEGER [out]
> If SORT = 'N', SDIM = 0.
> If SORT = 'S', SDIM = number of eigenvalues (after sorting)
> for which SELCTG is true.

ALPHA : COMPLEX array, dimension (N) [out]

BETA : COMPLEX array, dimension (N) [out]
> On exit,  ALPHA(j)/BETA(j), j=1,...,N, will be the
> generalized eigenvalues.  ALPHA(j), j=1,...,N  and  BETA(j),
> j=1,...,N  are the diagonals of the complex Schur form (A,B)
> output by CGGES. The  BETA(j) will be non-negative real.
> 
> Note: the quotients ALPHA(j)/BETA(j) may easily over- or
> underflow, and BETA(j) may even be zero.  Thus, the user
> should avoid naively computing the ratio alpha/beta.
> However, ALPHA will be always less than and usually
> comparable with norm(A) in magnitude, and BETA always less
> than and usually comparable with norm(B).

VSL : COMPLEX array, dimension (LDVSL,N) [out]
> If JOBVSL = 'V', VSL will contain the left Schur vectors.
> Not referenced if JOBVSL = 'N'.

LDVSL : INTEGER [in]
> The leading dimension of the matrix VSL. LDVSL >= 1, and
> if JOBVSL = 'V', LDVSL >= N.

VSR : COMPLEX array, dimension (LDVSR,N) [out]
> If JOBVSR = 'V', VSR will contain the right Schur vectors.
> Not referenced if JOBVSR = 'N'.

LDVSR : INTEGER [in]
> The leading dimension of the matrix VSR. LDVSR >= 1, and
> if JOBVSR = 'V', LDVSR >= N.

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.  LWORK >= max(1,2\*N).
> For good performance, LWORK must generally be larger.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

RWORK : REAL array, dimension (8\*N) [out]

BWORK : LOGICAL array, dimension (N) [out]
> Not referenced if SORT = 'N'.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> =1,...,N:
> The QZ iteration failed.  (A,B) are not in Schur
> form, but ALPHA(j) and BETA(j) should be correct for
> j=INFO+1,...,N.
> > N:  =N+1: other than QZ iteration failed in CHGEQZ
> =N+2: after reordering, roundoff changed values of
> some complex eigenvalues so that leading
> eigenvalues in the Generalized Schur form no
> longer satisfy SELCTG=.TRUE.  This could also
> be caused due to scaling.
> =N+3: reordering failed in CTGSEN.
