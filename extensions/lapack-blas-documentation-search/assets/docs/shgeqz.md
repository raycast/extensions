```fortran
subroutine shgeqz (
        character job,
        character compq,
        character compz,
        integer n,
        integer ilo,
        integer ihi,
        real, dimension( ldh, * ) h,
        integer ldh,
        real, dimension( ldt, * ) t,
        integer ldt,
        real, dimension( * ) alphar,
        real, dimension( * ) alphai,
        real, dimension( * ) beta,
        real, dimension( ldq, * ) q,
        integer ldq,
        real, dimension( ldz, * ) z,
        integer ldz,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

SHGEQZ computes the eigenvalues of a real matrix pair (H,T),
where H is an upper Hessenberg matrix and T is upper triangular,
using the double-shift QZ method.
Matrix pairs of this type are produced by the reduction to
generalized upper Hessenberg form of a real matrix pair (A,B):

A = Q1\*H\*Z1\*\*T,  B = Q1\*T\*Z1\*\*T,

as computed by SGGHRD.

If JOB='S', then the Hessenberg-triangular pair (H,T) is
also reduced to generalized Schur form,

H = Q\*S\*Z\*\*T,  T = Q\*P\*Z\*\*T,

where Q and Z are orthogonal matrices, P is an upper triangular
matrix, and S is a quasi-triangular matrix with 1-by-1 and 2-by-2
diagonal blocks.

The 1-by-1 blocks correspond to real eigenvalues of the matrix pair
(H,T) and the 2-by-2 blocks correspond to complex conjugate pairs of
eigenvalues.

Additionally, the 2-by-2 upper triangular diagonal blocks of P
corresponding to 2-by-2 blocks of S are reduced to positive diagonal
form, i.e., if S(j+1,j) is non-zero, then P(j+1,j) = P(j,j+1) = 0,
P(j,j) > 0, and P(j+1,j+1) > 0.

Optionally, the orthogonal matrix Q from the generalized Schur
factorization may be postmultiplied into an input matrix Q1, and the
orthogonal matrix Z may be postmultiplied into an input matrix Z1.
If Q1 and Z1 are the orthogonal matrices from SGGHRD that reduced
the matrix pair (A,B) to generalized upper Hessenberg form, then the
output matrices Q1\*Q and Z1\*Z are the orthogonal factors from the
generalized Schur factorization of (A,B):

A = (Q1\*Q)\*S\*(Z1\*Z)\*\*T,  B = (Q1\*Q)\*P\*(Z1\*Z)\*\*T.

To avoid overflow, eigenvalues of the matrix pair (H,T) (equivalently,
of (A,B)) are computed as a pair of values (alpha,beta), where alpha is
complex and beta real.
If beta is nonzero, lambda = alpha / beta is an eigenvalue of the
generalized nonsymmetric eigenvalue problem (GNEP)
A\*x = lambda\*B\*x
and if alpha is nonzero, mu = beta / alpha is an eigenvalue of the
alternate form of the GNEP
mu\*A\*y = B\*y.
Real eigenvalues can be read directly from the generalized Schur
form:
alpha = S(i,i), beta = P(i,i).

Ref: C.B. Moler & G.W. Stewart, , SIAM J. Numer. Anal., 10(1973),
pp. 241--256.

## Parameters
JOB : CHARACTER\*1 [in]
> = 'E': Compute eigenvalues only;
> = 'S': Compute eigenvalues and the Schur form.

COMPQ : CHARACTER\*1 [in]
> = 'N': Left Schur vectors (Q) are not computed;
> = 'I': Q is initialized to the unit matrix and the matrix Q
> of left Schur vectors of (H,T) is returned;
> = 'V': Q must contain an orthogonal matrix Q1 on entry and
> the product Q1\*Q is returned.

COMPZ : CHARACTER\*1 [in]
> = 'N': Right Schur vectors (Z) are not computed;
> = 'I': Z is initialized to the unit matrix and the matrix Z
> of right Schur vectors of (H,T) is returned;
> = 'V': Z must contain an orthogonal matrix Z1 on entry and
> the product Z1\*Z is returned.

N : INTEGER [in]
> The order of the matrices H, T, Q, and Z.  N >= 0.

ILO : INTEGER [in]

IHI : INTEGER [in]
> ILO and IHI mark the rows and columns of H which are in
> Hessenberg form.  It is assumed that A is already upper
> triangular in rows and columns 1:ILO-1 and IHI+1:N.
> If N > 0, 1 <= ILO <= IHI <= N; if N = 0, ILO=1 and IHI=0.

H : REAL array, dimension (LDH, N) [in,out]
> On entry, the N-by-N upper Hessenberg matrix H.
> On exit, if JOB = 'S', H contains the upper quasi-triangular
> matrix S from the generalized Schur factorization.
> If JOB = 'E', the diagonal blocks of H match those of S, but
> the rest of H is unspecified.

LDH : INTEGER [in]
> The leading dimension of the array H.  LDH >= max( 1, N ).

T : REAL array, dimension (LDT, N) [in,out]
> On entry, the N-by-N upper triangular matrix T.
> On exit, if JOB = 'S', T contains the upper triangular
> matrix P from the generalized Schur factorization;
> 2-by-2 diagonal blocks of P corresponding to 2-by-2 blocks of S
> are reduced to positive diagonal form, i.e., if H(j+1,j) is
> non-zero, then T(j+1,j) = T(j,j+1) = 0, T(j,j) > 0, and
> T(j+1,j+1) > 0.
> If JOB = 'E', the diagonal blocks of T match those of P, but
> the rest of T is unspecified.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= max( 1, N ).

ALPHAR : REAL array, dimension (N) [out]
> The real parts of each scalar alpha defining an eigenvalue
> of GNEP.

ALPHAI : REAL array, dimension (N) [out]
> The imaginary parts of each scalar alpha defining an
> eigenvalue of GNEP.
> If ALPHAI(j) is zero, then the j-th eigenvalue is real; if
> positive, then the j-th and (j+1)-st eigenvalues are a
> complex conjugate pair, with ALPHAI(j+1) = -ALPHAI(j).

BETA : REAL array, dimension (N) [out]
> The scalars beta that define the eigenvalues of GNEP.
> Together, the quantities alpha = (ALPHAR(j),ALPHAI(j)) and
> beta = BETA(j) represent the j-th eigenvalue of the matrix
> pair (A,B), in one of the forms lambda = alpha/beta or
> mu = beta/alpha.  Since either lambda or mu may overflow,
> they should not, in general, be computed.

Q : REAL array, dimension (LDQ, N) [in,out]
> On entry, if COMPQ = 'V', the orthogonal matrix Q1 used in
> the reduction of (A,B) to generalized Hessenberg form.
> On exit, if COMPQ = 'I', the orthogonal matrix of left Schur
> vectors of (H,T), and if COMPQ = 'V', the orthogonal matrix
> of left Schur vectors of (A,B).
> Not referenced if COMPQ = 'N'.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= 1.
> If COMPQ='V' or 'I', then LDQ >= N.

Z : REAL array, dimension (LDZ, N) [in,out]
> On entry, if COMPZ = 'V', the orthogonal matrix Z1 used in
> the reduction of (A,B) to generalized Hessenberg form.
> On exit, if COMPZ = 'I', the orthogonal matrix of
> right Schur vectors of (H,T), and if COMPZ = 'V', the
> orthogonal matrix of right Schur vectors of (A,B).
> Not referenced if COMPZ = 'N'.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1.
> If COMPZ='V' or 'I', then LDZ >= N.

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO >= 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.  LWORK >= max(1,N).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> = 1,...,N: the QZ iteration did not converge.  (H,T) is not
> in Schur form, but ALPHAR(i), ALPHAI(i), and
> BETA(i), i=INFO+1,...,N should be correct.
> = N+1,...,2\*N: the shift calculation failed.  (H,T) is not
> in Schur form, but ALPHAR(i), ALPHAI(i), and
> BETA(i), i=INFO-N+1,...,N should be correct.
