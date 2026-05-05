```fortran
subroutine cgees (
        character jobvs,
        character sort,
        external select,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        integer sdim,
        complex, dimension( * ) w,
        complex, dimension( ldvs, * ) vs,
        integer ldvs,
        complex, dimension( * ) work,
        integer lwork,
        real, dimension( * ) rwork,
        logical, dimension( * ) bwork,
        integer info
)
```

CGEES computes for an N-by-N complex nonsymmetric matrix A, the
eigenvalues, the Schur form T, and, optionally, the matrix of Schur
vectors Z.  This gives the Schur factorization A = Z\*T\*(Z\*\*H).

Optionally, it also orders the eigenvalues on the diagonal of the
Schur form so that selected eigenvalues are at the top left.
The leading columns of Z then form an orthonormal basis for the
invariant subspace corresponding to the selected eigenvalues.

A complex matrix is in Schur form if it is upper triangular.

## Parameters
JOBVS : CHARACTER\*1 [in]
> = 'N': Schur vectors are not computed;
> = 'V': Schur vectors are computed.

SORT : CHARACTER\*1 [in]
> Specifies whether or not to order the eigenvalues on the
> diagonal of the Schur form.
> = 'N': Eigenvalues are not ordered:
> = 'S': Eigenvalues are ordered (see SELECT).

SELECT : a LOGICAL FUNCTION of one COMPLEX argument [in]
> SELECT must be declared EXTERNAL in the calling subroutine.
> If SORT = 'S', SELECT is used to select eigenvalues to order
> to the top left of the Schur form.
> IF SORT = 'N', SELECT is not referenced.
> The eigenvalue W(j) is selected if SELECT(W(j)) is true.

N : INTEGER [in]
> The order of the matrix A. N >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the N-by-N matrix A.
> On exit, A has been overwritten by its Schur form T.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

SDIM : INTEGER [out]
> If SORT = 'N', SDIM = 0.
> If SORT = 'S', SDIM = number of eigenvalues for which
> SELECT is true.

W : COMPLEX array, dimension (N) [out]
> W contains the computed eigenvalues, in the same order that
> they appear on the diagonal of the output Schur form T.

VS : COMPLEX array, dimension (LDVS,N) [out]
> If JOBVS = 'V', VS contains the unitary matrix Z of Schur
> vectors.
> If JOBVS = 'N', VS is not referenced.

LDVS : INTEGER [in]
> The leading dimension of the array VS.  LDVS >= 1; if
> JOBVS = 'V', LDVS >= N.

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

RWORK : REAL array, dimension (N) [out]

BWORK : LOGICAL array, dimension (N) [out]
> Not referenced if SORT = 'N'.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value.
> > 0: if INFO = i, and i is
> <= N:  the QR algorithm failed to compute all the
> eigenvalues; elements 1:ILO-1 and i+1:N of W
> contain those eigenvalues which have converged;
> if JOBVS = 'V', VS contains the matrix which
> reduces A to its partially converged Schur form.
> = N+1: the eigenvalues could not be reordered because
> some eigenvalues were too close to separate (the
> problem is very ill-conditioned);
> = N+2: after reordering, roundoff changed values of
> some complex eigenvalues so that leading
> eigenvalues in the Schur form no longer satisfy
> SELECT = .TRUE..  This could also be caused by
> underflow due to scaling.
