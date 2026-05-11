```fortran
subroutine ctrsen (
        character job,
        character compq,
        logical, dimension( * ) select,
        integer n,
        complex, dimension( ldt, * ) t,
        integer ldt,
        complex, dimension( ldq, * ) q,
        integer ldq,
        complex, dimension( * ) w,
        integer m,
        real s,
        real sep,
        complex, dimension( * ) work,
        integer lwork,
        integer info
)
```

CTRSEN reorders the Schur factorization of a complex matrix
A = Q\*T\*Q\*\*H, so that a selected cluster of eigenvalues appears in
the leading positions on the diagonal of the upper triangular matrix
T, and the leading columns of Q form an orthonormal basis of the
corresponding right invariant subspace.

Optionally the routine computes the reciprocal condition numbers of
the cluster of eigenvalues and/or the invariant subspace.

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
> select the j-th eigenvalue, SELECT(j) must be set to .TRUE..

N : INTEGER [in]
> The order of the matrix T. N >= 0.

T : COMPLEX array, dimension (LDT,N) [in,out]
> On entry, the upper triangular matrix T.
> On exit, T is overwritten by the reordered matrix T, with the
> selected eigenvalues as the leading diagonal elements.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= max(1,N).

Q : COMPLEX array, dimension (LDQ,N) [in,out]
> On entry, if COMPQ = 'V', the matrix Q of Schur vectors.
> On exit, if COMPQ = 'V', Q has been postmultiplied by the
> unitary transformation matrix which reorders T; the leading M
> columns of Q form an orthonormal basis for the specified
> invariant subspace.
> If COMPQ = 'N', Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q.
> LDQ >= 1; and if COMPQ = 'V', LDQ >= N.

W : COMPLEX array, dimension (N) [out]
> The reordered eigenvalues of T, in the same order as they
> appear on the diagonal of T.

M : INTEGER [out]
> The dimension of the specified invariant subspace.
> 0 <= M <= N.

S : REAL [out]
> If JOB = 'E' or 'B', S is a lower bound on the reciprocal
> condition number for the selected cluster of eigenvalues.
> S cannot underestimate the true reciprocal condition number
> by more than a factor of sqrt(N). If M = 0 or N, S = 1.
> If JOB = 'N' or 'V', S is not referenced.

SEP : REAL [out]
> If JOB = 'V' or 'B', SEP is the estimated reciprocal
> condition number of the specified invariant subspace. If
> M = 0 or N, SEP = norm(T).
> If JOB = 'N' or 'E', SEP is not referenced.

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If JOB = 'N', LWORK >= 1;
> if JOB = 'E', LWORK = max(1,M\*(N-M));
> if JOB = 'V' or 'B', LWORK >= max(1,2\*M\*(N-M)).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
