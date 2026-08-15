```fortran
subroutine dgees (
        character jobvs,
        character sort,
        external select,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        integer sdim,
        double precision, dimension( * ) wr,
        double precision, dimension( * ) wi,
        double precision, dimension( ldvs, * ) vs,
        integer ldvs,
        double precision, dimension( * ) work,
        integer lwork,
        logical, dimension( * ) bwork,
        integer info
)
```

DGEES computes for an N-by-N real nonsymmetric matrix A, the
eigenvalues, the real Schur form T, and, optionally, the matrix of
Schur vectors Z.  This gives the Schur factorization A = Z\*T\*(Z\*\*T).

Optionally, it also orders the eigenvalues on the diagonal of the
real Schur form so that selected eigenvalues are at the top left.
The leading columns of Z then form an orthonormal basis for the
invariant subspace corresponding to the selected eigenvalues.

A matrix is in real Schur form if it is upper quasi-triangular with
1-by-1 and 2-by-2 blocks. 2-by-2 blocks will be standardized in the
form
[  a  b  ]
[  c  a  ]

where b\*c < 0. The eigenvalues of such a block are a +- sqrt(bc).

## Parameters
JOBVS : CHARACTER\*1 [in]
> = 'N': Schur vectors are not computed;
> = 'V': Schur vectors are computed.

SORT : CHARACTER\*1 [in]
> Specifies whether or not to order the eigenvalues on the
> diagonal of the Schur form.
> = 'N': Eigenvalues are not ordered;
> = 'S': Eigenvalues are ordered (see SELECT).

SELECT : a LOGICAL FUNCTION of two DOUBLE PRECISION arguments [in]
> SELECT must be declared EXTERNAL in the calling subroutine.
> If SORT = 'S', SELECT is used to select eigenvalues to sort
> to the top left of the Schur form.
> If SORT = 'N', SELECT is not referenced.
> An eigenvalue WR(j)+sqrt(-1)\*WI(j) is selected if
> SELECT(WR(j),WI(j)) is true; i.e., if either one of a complex
> conjugate pair of eigenvalues is selected, then both complex
> eigenvalues are selected.
> Note that a selected complex eigenvalue may no longer
> satisfy SELECT(WR(j),WI(j)) = .TRUE. after ordering, since
> ordering may change the value of complex eigenvalues
> (especially if the eigenvalue is ill-conditioned); in this
> case INFO is set to N+2 (see INFO below).

N : INTEGER [in]
> The order of the matrix A. N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the N-by-N matrix A.
> On exit, A has been overwritten by its real Schur form T.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

SDIM : INTEGER [out]
> If SORT = 'N', SDIM = 0.
> If SORT = 'S', SDIM = number of eigenvalues (after sorting)
> for which SELECT is true. (Complex conjugate
> pairs for which SELECT is true for either
> eigenvalue count as 2.)

WR : DOUBLE PRECISION array, dimension (N) [out]

WI : DOUBLE PRECISION array, dimension (N) [out]
> WR and WI contain the real and imaginary parts,
> respectively, of the computed eigenvalues in the same order
> that they appear on the diagonal of the output Schur form T.
> Complex conjugate pairs of eigenvalues will appear
> consecutively with the eigenvalue having the positive
> imaginary part first.

VS : DOUBLE PRECISION array, dimension (LDVS,N) [out]
> If JOBVS = 'V', VS contains the orthogonal matrix Z of Schur
> vectors.
> If JOBVS = 'N', VS is not referenced.

LDVS : INTEGER [in]
> The leading dimension of the array VS.  LDVS >= 1; if
> JOBVS = 'V', LDVS >= N.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) contains the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.  LWORK >= max(1,3\*N).
> For good performance, LWORK must generally be larger.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

BWORK : LOGICAL array, dimension (N) [out]
> Not referenced if SORT = 'N'.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value.
> > 0: if INFO = i, and i is
> <= N: the QR algorithm failed to compute all the
> eigenvalues; elements 1:ILO-1 and i+1:N of WR and WI
> contain those eigenvalues which have converged; if
> JOBVS = 'V', VS contains the matrix which reduces A
> to its partially converged Schur form.
> = N+1: the eigenvalues could not be reordered because some
> eigenvalues were too close to separate (the problem
> is very ill-conditioned);
> = N+2: after reordering, roundoff changed values of some
> complex eigenvalues so that leading eigenvalues in
> the Schur form no longer satisfy SELECT=.TRUE.  This
> could also be caused by underflow due to scaling.
