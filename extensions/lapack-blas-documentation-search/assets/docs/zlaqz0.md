```fortran
recursive subroutine zlaqz0 (
        character, intent(in) wants,
        character, intent(in) wantq,
        character, intent(in) wantz,
        integer, intent(in) n,
        integer, intent(in) ilo,
        integer, intent(in) ihi,
        complex*16, dimension( lda, * ), intent(inout) a,
        integer, intent(in) lda,
        complex*16, dimension( ldb, * ), intent(inout) b,
        integer, intent(in) ldb,
        complex*16, dimension( * ), intent(inout) alpha,
        complex*16, dimension( * ), intent(inout) beta,
        complex*16, dimension( ldq,         * ), intent(inout) q,
        integer, intent(in) ldq,
        complex*16, dimension( ldz, * ), intent(inout) z,
        integer, intent(in) ldz,
        complex*16, dimension( * ), intent(inout) work,
        integer, intent(in) lwork,
        double precision, dimension( * ), intent(out) rwork,
        integer, intent(in) rec,
        integer, intent(out) info
)
```

ZLAQZ0 computes the eigenvalues of a real matrix pair (H,T),
where H is an upper Hessenberg matrix and T is upper triangular,
using the double-shift QZ method.
Matrix pairs of this type are produced by the reduction to
generalized upper Hessenberg form of a real matrix pair (A,B):

A = Q1\*H\*Z1\*\*H,  B = Q1\*T\*Z1\*\*H,

as computed by ZGGHRD.

If JOB='S', then the Hessenberg-triangular pair (H,T) is
also reduced to generalized Schur form,

H = Q\*S\*Z\*\*H,  T = Q\*P\*Z\*\*H,

where Q and Z are unitary matrices, P and S are an upper triangular
matrices.

Optionally, the unitary matrix Q from the generalized Schur
factorization may be postmultiplied into an input matrix Q1, and the
unitary matrix Z may be postmultiplied into an input matrix Z1.
If Q1 and Z1 are the unitary matrices from ZGGHRD that reduced
the matrix pair (A,B) to generalized upper Hessenberg form, then the
output matrices Q1\*Q and Z1\*Z are the unitary factors from the
generalized Schur factorization of (A,B):

A = (Q1\*Q)\*S\*(Z1\*Z)\*\*H,  B = (Q1\*Q)\*P\*(Z1\*Z)\*\*H.

To avoid overflow, eigenvalues of the matrix pair (H,T) (equivalently,
of (A,B)) are computed as a pair of values (alpha,beta), where alpha is
complex and beta real.
If beta is nonzero, lambda = alpha / beta is an eigenvalue of the
generalized nonsymmetric eigenvalue problem (GNEP)
A\*x = lambda\*B\*x
and if alpha is nonzero, mu = beta / alpha is an eigenvalue of the
alternate form of the GNEP
mu\*A\*y = B\*y.
Eigenvalues can be read directly from the generalized Schur
form:
alpha = S(i,i), beta = P(i,i).

Ref: C.B. Moler & G.W. Stewart, , SIAM J. Numer. Anal., 10(1973),
pp. 241--256.

Ref: B. Kagstrom, D. Kressner, , SIAM J. Numer.
Anal., 29(2006), pp. 199--227.

Ref: T. Steel, D. Camps, K. Meerbergen, R. Vandebril

## Parameters
WANTS : CHARACTER\*1 [in]
> = 'E': Compute eigenvalues only;
> = 'S': Compute eigenvalues and the Schur form.

WANTQ : CHARACTER\*1 [in]
> = 'N': Left Schur vectors (Q) are not computed;
> = 'I': Q is initialized to the unit matrix and the matrix Q
> of left Schur vectors of (A,B) is returned;
> = 'V': Q must contain an unitary matrix Q1 on entry and
> the product Q1\*Q is returned.

WANTZ : CHARACTER\*1 [in]
> = 'N': Right Schur vectors (Z) are not computed;
> = 'I': Z is initialized to the unit matrix and the matrix Z
> of right Schur vectors of (A,B) is returned;
> = 'V': Z must contain an unitary matrix Z1 on entry and
> the product Z1\*Z is returned.

N : INTEGER [in]
> The order of the matrices A, B, Q, and Z.  N >= 0.

ILO : INTEGER [in]

IHI : INTEGER [in]
> ILO and IHI mark the rows and columns of A which are in
> Hessenberg form.  It is assumed that A is already upper
> triangular in rows and columns 1:ILO-1 and IHI+1:N.
> If N > 0, 1 <= ILO <= IHI <= N; if N = 0, ILO=1 and IHI=0.

A : COMPLEX\*16 array, dimension (LDA, N) [in,out]
> On entry, the N-by-N upper Hessenberg matrix A.
> On exit, if JOB = 'S', A contains the upper triangular
> matrix S from the generalized Schur factorization.
> If JOB = 'E', the diagonal blocks of A match those of S, but
> the rest of A is unspecified.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max( 1, N ).

B : COMPLEX\*16 array, dimension (LDB, N) [in,out]
> On entry, the N-by-N upper triangular matrix B.
> On exit, if JOB = 'S', B contains the upper triangular
> matrix P from the generalized Schur factorization;
> If JOB = 'E', the diagonal blocks of B match those of P, but
> the rest of B is unspecified.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max( 1, N ).

ALPHA : COMPLEX\*16 array, dimension (N) [out]
> Each scalar alpha defining an eigenvalue
> of GNEP.

BETA : COMPLEX\*16 array, dimension (N) [out]
> The scalars beta that define the eigenvalues of GNEP.
> Together, the quantities alpha = ALPHA(j) and
> beta = BETA(j) represent the j-th eigenvalue of the matrix
> pair (A,B), in one of the forms lambda = alpha/beta or
> mu = beta/alpha.  Since either lambda or mu may overflow,
> they should not, in general, be computed.

Q : COMPLEX\*16 array, dimension (LDQ, N) [in,out]
> On entry, if COMPQ = 'V', the unitary matrix Q1 used in
> the reduction of (A,B) to generalized Hessenberg form.
> On exit, if COMPQ = 'I', the unitary matrix of left Schur
> vectors of (A,B), and if COMPQ = 'V', the unitary matrix
> of left Schur vectors of (A,B).
> Not referenced if COMPQ = 'N'.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= 1.
> If COMPQ='V' or 'I', then LDQ >= N.

Z : COMPLEX\*16 array, dimension (LDZ, N) [in,out]
> On entry, if COMPZ = 'V', the unitary matrix Z1 used in
> the reduction of (A,B) to generalized Hessenberg form.
> On exit, if COMPZ = 'I', the unitary matrix of
> right Schur vectors of (H,T), and if COMPZ = 'V', the
> unitary matrix of right Schur vectors of (A,B).
> Not referenced if COMPZ = 'N'.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1.
> If COMPZ='V' or 'I', then LDZ >= N.

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO >= 0, WORK(1) returns the optimal LWORK.

RWORK : DOUBLE PRECISION array, dimension (N) [out]

LWORK : INTEGER [in]
> The dimension of the array WORK.  LWORK >= max(1,N).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

REC : INTEGER [in]
> REC indicates the current recursion level. Should be set
> to 0 on first call.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> = 1,...,N: the QZ iteration did not converge.  (A,B) is not
> in Schur form, but ALPHA(i) and
> BETA(i), i=INFO+1,...,N should be correct.
