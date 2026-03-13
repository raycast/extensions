```fortran
subroutine sgges3 (
        character jobvsl,
        character jobvsr,
        character sort,
        external selctg,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        integer sdim,
        real, dimension( * ) alphar,
        real, dimension( * ) alphai,
        real, dimension( * ) beta,
        real, dimension( ldvsl, * ) vsl,
        integer ldvsl,
        real, dimension( ldvsr, * ) vsr,
        integer ldvsr,
        real, dimension( * ) work,
        integer lwork,
        logical, dimension( * ) bwork,
        integer info
)
```

SGGES3 computes for a pair of N-by-N real nonsymmetric matrices (A,B),
the generalized eigenvalues, the generalized real Schur form (S,T),
optionally, the left and/or right matrices of Schur vectors (VSL and
VSR). This gives the generalized Schur factorization

(A,B) = ( (VSL)\*S\*(VSR)\*\*T, (VSL)\*T\*(VSR)\*\*T )

Optionally, it also orders the eigenvalues so that a selected cluster
of eigenvalues appears in the leading diagonal blocks of the upper
quasi-triangular matrix S and the upper triangular matrix T.The
leading columns of VSL and VSR then form an orthonormal basis for the
corresponding left and right eigenspaces (deflating subspaces).

(If only the generalized eigenvalues are needed, use the driver
SGGEV instead, which is faster.)

A generalized eigenvalue for a pair of matrices (A,B) is a scalar w
or a ratio alpha/beta = w, such that  A - w\*B is singular.  It is
usually represented as the pair (alpha,beta), as there is a
reasonable interpretation for beta=0 or both being zero.

A pair of matrices (S,T) is in generalized real Schur form if T is
upper triangular with non-negative diagonal and S is block upper
triangular with 1-by-1 and 2-by-2 blocks.  1-by-1 blocks correspond
to real generalized eigenvalues, while 2-by-2 blocks of S will be
by making the corresponding elements of T have the
form:
[  a  0  ]
[  0  b  ]

and the pair of corresponding 2-by-2 blocks in S and T will have a
complex conjugate pair of generalized eigenvalues.

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
> = 'S':  Eigenvalues are ordered (see SELCTG);

SELCTG : a LOGICAL FUNCTION of three REAL arguments [in]
> SELCTG must be declared EXTERNAL in the calling subroutine.
> If SORT = 'N', SELCTG is not referenced.
> If SORT = 'S', SELCTG is used to select eigenvalues to sort
> to the top left of the Schur form.
> An eigenvalue (ALPHAR(j)+ALPHAI(j))/BETA(j) is selected if
> SELCTG(ALPHAR(j),ALPHAI(j),BETA(j)) is true; i.e. if either
> one of a complex conjugate pair of eigenvalues is selected,
> then both complex eigenvalues are selected.
> 
> Note that in the ill-conditioned case, a selected complex
> eigenvalue may no longer satisfy SELCTG(ALPHAR(j),ALPHAI(j),
> BETA(j)) = .TRUE. after ordering. INFO is to be set to N+2
> in this case.

N : INTEGER [in]
> The order of the matrices A, B, VSL, and VSR.  N >= 0.

A : REAL array, dimension (LDA, N) [in,out]
> On entry, the first of the pair of matrices.
> On exit, A has been overwritten by its generalized Schur
> form S.

LDA : INTEGER [in]
> The leading dimension of A.  LDA >= max(1,N).

B : REAL array, dimension (LDB, N) [in,out]
> On entry, the second of the pair of matrices.
> On exit, B has been overwritten by its generalized Schur
> form T.

LDB : INTEGER [in]
> The leading dimension of B.  LDB >= max(1,N).

SDIM : INTEGER [out]
> If SORT = 'N', SDIM = 0.
> If SORT = 'S', SDIM = number of eigenvalues (after sorting)
> for which SELCTG is true.  (Complex conjugate pairs for which
> SELCTG is true for either eigenvalue count as 2.)

ALPHAR : REAL array, dimension (N) [out]

ALPHAI : REAL array, dimension (N) [out]

BETA : REAL array, dimension (N) [out]
> On exit, (ALPHAR(j) + ALPHAI(j)\*i)/BETA(j), j=1,...,N, will
> be the generalized eigenvalues.  ALPHAR(j) + ALPHAI(j)\*i,
> and  BETA(j),j=1,...,N are the diagonals of the complex Schur
> form (S,T) that would result if the 2-by-2 diagonal blocks of
> the real Schur form of (A,B) were further reduced to
> triangular form using 2-by-2 complex unitary transformations.
> If ALPHAI(j) is zero, then the j-th eigenvalue is real; if
> positive, then the j-th and (j+1)-st eigenvalues are a
> complex conjugate pair, with ALPHAI(j+1) negative.
> 
> Note: the quotients ALPHAR(j)/BETA(j) and ALPHAI(j)/BETA(j)
> may easily over- or underflow, and BETA(j) may even be zero.
> Thus, the user should avoid naively computing the ratio.
> However, ALPHAR and ALPHAI will be always less than and
> usually comparable with norm(A) in magnitude, and BETA always
> less than and usually comparable with norm(B).

VSL : REAL array, dimension (LDVSL,N) [out]
> If JOBVSL = 'V', VSL will contain the left Schur vectors.
> Not referenced if JOBVSL = 'N'.

LDVSL : INTEGER [in]
> The leading dimension of the matrix VSL. LDVSL >=1, and
> if JOBVSL = 'V', LDVSL >= N.

VSR : REAL array, dimension (LDVSR,N) [out]
> If JOBVSR = 'V', VSR will contain the right Schur vectors.
> Not referenced if JOBVSR = 'N'.

LDVSR : INTEGER [in]
> The leading dimension of the matrix VSR. LDVSR >= 1, and
> if JOBVSR = 'V', LDVSR >= N.

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If N = 0, LWORK >= 1, else LWORK >= 6\*N+16.
> For good performance, LWORK must generally be larger.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

BWORK : LOGICAL array, dimension (N) [out]
> Not referenced if SORT = 'N'.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> = 1,...,N:
> The QZ iteration failed.  (A,B) are not in Schur
> form, but ALPHAR(j), ALPHAI(j), and BETA(j) should
> be correct for j=INFO+1,...,N.
> > N:  =N+1: other than QZ iteration failed in SLAQZ0.
> =N+2: after reordering, roundoff changed values of
> some complex eigenvalues so that leading
> eigenvalues in the Generalized Schur form no
> longer satisfy SELCTG=.TRUE.  This could also
> be caused due to scaling.
> =N+3: reordering failed in STGSEN.
