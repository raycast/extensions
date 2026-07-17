```fortran
subroutine dtrsen (
        character job,
        character compq,
        logical, dimension( * ) select,
        integer n,
        double precision, dimension( ldt, * ) t,
        integer ldt,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        double precision, dimension( * ) wr,
        double precision, dimension( * ) wi,
        integer m,
        double precision s,
        double precision sep,
        double precision, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer liwork,
        integer info
)
```

DTRSEN reorders the real Schur factorization of a real matrix
A = Q\*T\*Q\*\*T, so that a selected cluster of eigenvalues appears in
the leading diagonal blocks of the upper quasi-triangular matrix T,
and the leading columns of Q form an orthonormal basis of the
corresponding right invariant subspace.

Optionally the routine computes the reciprocal condition numbers of
the cluster of eigenvalues and/or the invariant subspace.

T must be in Schur canonical form (as returned by DHSEQR), that is,
block upper triangular with 1-by-1 and 2-by-2 diagonal blocks; each
2-by-2 diagonal block has its diagonal elements equal and its
off-diagonal elements of opposite sign.

## Parameters
JOB : CHARACTER\*1 [in]
> Specifies whether condition numbers are required for the
> cluster of eigenvalues (S) or the invariant subspace (SEP):
> = 'N': none;
> = 'E': for eigenvalues only (S);
> = 'V': for invariant subspace only (SEP);
> = 'B': for both eigenvalues and invariant subspace (S and
> SEP).

COMPQ : CHARACTER\*1 [in]
> = 'V': update the matrix Q of Schur vectors;
> = 'N': do not update Q.

SELECT : LOGICAL array, dimension (N) [in]
> SELECT specifies the eigenvalues in the selected cluster. To
> select a real eigenvalue w(j), SELECT(j) must be set to
> .TRUE.. To select a complex conjugate pair of eigenvalues
> w(j) and w(j+1), corresponding to a 2-by-2 diagonal block,
> either SELECT(j) or SELECT(j+1) or both must be set to
> .TRUE.; a complex conjugate pair of eigenvalues must be
> either both included in the cluster or both excluded.

N : INTEGER [in]
> The order of the matrix T. N >= 0.

T : DOUBLE PRECISION array, dimension (LDT,N) [in,out]
> On entry, the upper quasi-triangular matrix T, in Schur
> canonical form.
> On exit, T is overwritten by the reordered matrix T, again in
> Schur canonical form, with the selected eigenvalues in the
> leading diagonal blocks.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= max(1,N).

Q : DOUBLE PRECISION array, dimension (LDQ,N) [in,out]
> On entry, if COMPQ = 'V', the matrix Q of Schur vectors.
> On exit, if COMPQ = 'V', Q has been postmultiplied by the
> orthogonal transformation matrix which reorders T; the
> leading M columns of Q form an orthonormal basis for the
> specified invariant subspace.
> If COMPQ = 'N', Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q.
> LDQ >= 1; and if COMPQ = 'V', LDQ >= N.

WR : DOUBLE PRECISION array, dimension (N) [out]

WI : DOUBLE PRECISION array, dimension (N) [out]
> 
> The real and imaginary parts, respectively, of the reordered
> eigenvalues of T. The eigenvalues are stored in the same
> order as on the diagonal of T, with WR(i) = T(i,i) and, if
> T(i:i+1,i:i+1) is a 2-by-2 diagonal block, WI(i) > 0 and
> WI(i+1) = -WI(i). Note that if a complex eigenvalue is
> sufficiently ill-conditioned, then its value may differ
> significantly from its value before reordering.

M : INTEGER [out]
> The dimension of the specified invariant subspace.
> 0 < = M <= N.

S : DOUBLE PRECISION [out]
> If JOB = 'E' or 'B', S is a lower bound on the reciprocal
> condition number for the selected cluster of eigenvalues.
> S cannot underestimate the true reciprocal condition number
> by more than a factor of sqrt(N). If M = 0 or N, S = 1.
> If JOB = 'N' or 'V', S is not referenced.

SEP : DOUBLE PRECISION [out]
> If JOB = 'V' or 'B', SEP is the estimated reciprocal
> condition number of the specified invariant subspace. If
> M = 0 or N, SEP = norm(T).
> If JOB = 'N' or 'E', SEP is not referenced.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If JOB = 'N', LWORK >= max(1,N);
> if JOB = 'E', LWORK >= max(1,M\*(N-M));
> if JOB = 'V' or 'B', LWORK >= max(1,2\*M\*(N-M)).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (MAX(1,LIWORK)) [out]
> On exit, if INFO = 0, IWORK(1) returns the optimal LIWORK.

LIWORK : INTEGER [in]
> The dimension of the array IWORK.
> If JOB = 'N' or 'E', LIWORK >= 1;
> if JOB = 'V' or 'B', LIWORK >= max(1,M\*(N-M)).
> 
> If LIWORK = -1, then a workspace query is assumed; the
> routine only calculates the optimal size of the IWORK array,
> returns this value as the first entry of the IWORK array, and
> no error message related to LIWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> = 1: reordering of T failed because some eigenvalues are too
> close to separate (the problem is very ill-conditioned);
> T may have been partially reordered, and WR and WI
> contain the eigenvalues in the same order as in T; S and
> SEP (if requested) are set to zero.
