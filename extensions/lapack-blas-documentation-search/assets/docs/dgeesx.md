```fortran
subroutine dgeesx (
        character jobvs,
        character sort,
        external select,
        character sense,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        integer sdim,
        double precision, dimension( * ) wr,
        double precision, dimension( * ) wi,
        double precision, dimension( ldvs, * ) vs,
        integer ldvs,
        double precision rconde,
        double precision rcondv,
        double precision, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer liwork,
        logical, dimension( * ) bwork,
        integer info
)
```

DGEESX computes for an N-by-N real nonsymmetric matrix A, the
eigenvalues, the real Schur form T, and, optionally, the matrix of
Schur vectors Z.  This gives the Schur factorization A = Z\*T\*(Z\*\*T).

Optionally, it also orders the eigenvalues on the diagonal of the
real Schur form so that selected eigenvalues are at the top left;
computes a reciprocal condition number for the average of the
selected eigenvalues (RCONDE); and computes a reciprocal condition
number for the right invariant subspace corresponding to the
selected eigenvalues (RCONDV).  The leading columns of Z form an
orthonormal basis for this invariant subspace.

For further explanation of the reciprocal condition numbers RCONDE
and RCONDV, see Section 4.10 of the LAPACK Users' Guide (where
these quantities are called s and sep respectively).

A real matrix is in real Schur form if it is upper quasi-triangular
with 1-by-1 and 2-by-2 blocks. 2-by-2 blocks will be standardized in
the form
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
> SELECT(WR(j),WI(j)) is true; i.e., if either one of a
> complex conjugate pair of eigenvalues is selected, then both
> are.  Note that a selected complex eigenvalue may no longer
> satisfy SELECT(WR(j),WI(j)) = .TRUE. after ordering, since
> ordering may change the value of complex eigenvalues
> (especially if the eigenvalue is ill-conditioned); in this
> case INFO may be set to N+3 (see INFO below).

SENSE : CHARACTER\*1 [in]
> Determines which reciprocal condition numbers are computed.
> = 'N': None are computed;
> = 'E': Computed for average of selected eigenvalues only;
> = 'V': Computed for selected right invariant subspace only;
> = 'B': Computed for both.
> If SENSE = 'E', 'V' or 'B', SORT must equal 'S'.

N : INTEGER [in]
> The order of the matrix A. N >= 0.

A : DOUBLE PRECISION array, dimension (LDA, N) [in,out]
> On entry, the N-by-N matrix A.
> On exit, A is overwritten by its real Schur form T.

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
> WR and WI contain the real and imaginary parts, respectively,
> of the computed eigenvalues, in the same order that they
> appear on the diagonal of the output Schur form T.  Complex
> conjugate pairs of eigenvalues appear consecutively with the
> eigenvalue having the positive imaginary part first.

VS : DOUBLE PRECISION array, dimension (LDVS,N) [out]
> If JOBVS = 'V', VS contains the orthogonal matrix Z of Schur
> vectors.
> If JOBVS = 'N', VS is not referenced.

LDVS : INTEGER [in]
> The leading dimension of the array VS.  LDVS >= 1, and if
> JOBVS = 'V', LDVS >= N.

RCONDE : DOUBLE PRECISION [out]
> If SENSE = 'E' or 'B', RCONDE contains the reciprocal
> condition number for the average of the selected eigenvalues.
> Not referenced if SENSE = 'N' or 'V'.

RCONDV : DOUBLE PRECISION [out]
> If SENSE = 'V' or 'B', RCONDV contains the reciprocal
> condition number for the selected right invariant subspace.
> Not referenced if SENSE = 'N' or 'E'.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.  LWORK >= max(1,3\*N).
> Also, if SENSE = 'E' or 'V' or 'B',
> LWORK >= N+2\*SDIM\*(N-SDIM), where SDIM is the number of
> selected eigenvalues computed by this routine.  Note that
> N+2\*SDIM\*(N-SDIM) <= N+N\*N/2. Note also that an error is only
> returned if LWORK < max(1,3\*N), but if SENSE = 'E' or 'V' or
> 'B' this may not be large enough.
> For good performance, LWORK must generally be larger.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates upper bounds on the optimal sizes of the
> arrays WORK and IWORK, returns these values as the first
> entries of the WORK and IWORK arrays, and no error messages
> related to LWORK or LIWORK are issued by XERBLA.

IWORK : INTEGER array, dimension (MAX(1,LIWORK)) [out]
> On exit, if INFO = 0, IWORK(1) returns the optimal LIWORK.

LIWORK : INTEGER [in]
> The dimension of the array IWORK.
> LIWORK >= 1; if SENSE = 'V' or 'B', LIWORK >= SDIM\*(N-SDIM).
> Note that SDIM\*(N-SDIM) <= N\*N/4. Note also that an error is
> only returned if LIWORK < 1, but if SENSE = 'V' or 'B' this
> may not be large enough.
> 
> If LIWORK = -1, then a workspace query is assumed; the
> routine only calculates upper bounds on the optimal sizes of
> the arrays WORK and IWORK, returns these values as the first
> entries of the WORK and IWORK arrays, and no error messages
> related to LWORK or LIWORK are issued by XERBLA.

BWORK : LOGICAL array, dimension (N) [out]
> Not referenced if SORT = 'N'.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value.
> > 0: if INFO = i, and i is
> <= N: the QR algorithm failed to compute all the
> eigenvalues; elements 1:ILO-1 and i+1:N of WR and WI
> contain those eigenvalues which have converged; if
> JOBVS = 'V', VS contains the transformation which
> reduces A to its partially converged Schur form.
> = N+1: the eigenvalues could not be reordered because some
> eigenvalues were too close to separate (the problem
> is very ill-conditioned);
> = N+2: after reordering, roundoff changed values of some
> complex eigenvalues so that leading eigenvalues in
> the Schur form no longer satisfy SELECT=.TRUE.  This
> could also be caused by underflow due to scaling.
