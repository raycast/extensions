```fortran
subroutine ztgsja (
        character jobu,
        character jobv,
        character jobq,
        integer m,
        integer p,
        integer n,
        integer k,
        integer l,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        double precision tola,
        double precision tolb,
        double precision, dimension( * ) alpha,
        double precision, dimension( * ) beta,
        complex*16, dimension( ldu, * ) u,
        integer ldu,
        complex*16, dimension( ldv, * ) v,
        integer ldv,
        complex*16, dimension( ldq, * ) q,
        integer ldq,
        complex*16, dimension( * ) work,
        integer ncycle,
        integer info
)
```

ZTGSJA computes the generalized singular value decomposition (GSVD)
of two complex upper triangular (or trapezoidal) matrices A and B.

On entry, it is assumed that matrices A and B have the following
forms, which may be obtained by the preprocessing subroutine ZGGSVP
from a general M-by-N matrix A and P-by-N matrix B:

N-K-L  K    L
A =    K ( 0    A12  A13 ) if M-K-L >= 0;
L ( 0     0   A23 )
M-K-L ( 0     0    0  )

N-K-L  K    L
A =  K ( 0    A12  A13 ) if M-K-L < 0;
M-K ( 0     0   A23 )

N-K-L  K    L
B =  L ( 0     0   B13 )
P-L ( 0     0    0  )

where the K-by-K matrix A12 and L-by-L matrix B13 are nonsingular
upper triangular; A23 is L-by-L upper triangular if M-K-L >= 0,
otherwise A23 is (M-K)-by-L upper trapezoidal.

On exit,

U\*\*H \*A\*Q = D1\*( 0 R ),    V\*\*H \*B\*Q = D2\*( 0 R ),

where U, V and Q are unitary matrices.
R is a nonsingular upper triangular matrix, and D1
and D2 are ``diagonal'' matrices, which are of the following
structures:

If M-K-L >= 0,

K  L
D1 =     K ( I  0 )
L ( 0  C )
M-K-L ( 0  0 )

K  L
D2 = L   ( 0  S )
P-L ( 0  0 )

N-K-L  K    L
( 0 R ) = K (  0   R11  R12 ) K
L (  0    0   R22 ) L

where

C = diag( ALPHA(K+1), ... , ALPHA(K+L) ),
S = diag( BETA(K+1),  ... , BETA(K+L) ),
C\*\*2 + S\*\*2 = I.

R is stored in A(1:K+L,N-K-L+1:N) on exit.

If M-K-L < 0,

K M-K K+L-M
D1 =   K ( I  0    0   )
M-K ( 0  C    0   )

K M-K K+L-M
D2 =   M-K ( 0  S    0   )
K+L-M ( 0  0    I   )
P-L ( 0  0    0   )

N-K-L  K   M-K  K+L-M
( 0 R ) =    K ( 0    R11  R12  R13  )
M-K ( 0     0   R22  R23  )
K+L-M ( 0     0    0   R33  )

where
C = diag( ALPHA(K+1), ... , ALPHA(M) ),
S = diag( BETA(K+1),  ... , BETA(M) ),
C\*\*2 + S\*\*2 = I.

R = ( R11 R12 R13 ) is stored in A(1:M, N-K-L+1:N) and R33 is stored
(  0  R22 R23 )
in B(M-K+1:L,N+M-K-L+1:N) on exit.

The computation of the unitary transformation matrices U, V or Q
is optional.  These matrices may either be formed explicitly, or they
may be postmultiplied into input matrices U1, V1, or Q1.

## Parameters
JOBU : CHARACTER\*1 [in]
> = 'U':  U must contain a unitary matrix U1 on entry, and
> the product U1\*U is returned;
> = 'I':  U is initialized to the unit matrix, and the
> unitary matrix U is returned;
> = 'N':  U is not computed.

JOBV : CHARACTER\*1 [in]
> = 'V':  V must contain a unitary matrix V1 on entry, and
> the product V1\*V is returned;
> = 'I':  V is initialized to the unit matrix, and the
> unitary matrix V is returned;
> = 'N':  V is not computed.

JOBQ : CHARACTER\*1 [in]
> = 'Q':  Q must contain a unitary matrix Q1 on entry, and
> the product Q1\*Q is returned;
> = 'I':  Q is initialized to the unit matrix, and the
> unitary matrix Q is returned;
> = 'N':  Q is not computed.

M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

P : INTEGER [in]
> The number of rows of the matrix B.  P >= 0.

N : INTEGER [in]
> The number of columns of the matrices A and B.  N >= 0.

K : INTEGER [in]

L : INTEGER [in]
> 
> K and L specify the subblocks in the input matrices A and B:
> A23 = A(K+1:MIN(K+L,M),N-L+1:N) and B13 = B(1:L,,N-L+1:N)
> of A and B, whose GSVD is going to be computed by ZTGSJA.
> See Further Details.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit, A(N-K+1:N,1:MIN(K+L,M) ) contains the triangular
> matrix R or part of R.  See Purpose for details.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,M).

B : COMPLEX\*16 array, dimension (LDB,N) [in,out]
> On entry, the P-by-N matrix B.
> On exit, if necessary, B(M-K+1:L,N+M-K-L+1:N) contains
> a part of R.  See Purpose for details.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,P).

TOLA : DOUBLE PRECISION [in]

TOLB : DOUBLE PRECISION [in]
> 
> TOLA and TOLB are the convergence criteria for the Jacobi-
> Kogbetliantz iteration procedure. Generally, they are the
> same as used in the preprocessing step, say
> TOLA = MAX(M,N)\*norm(A)\*MAZHEPS,
> TOLB = MAX(P,N)\*norm(B)\*MAZHEPS.

ALPHA : DOUBLE PRECISION array, dimension (N) [out]

BETA : DOUBLE PRECISION array, dimension (N) [out]
> 
> On exit, ALPHA and BETA contain the generalized singular
> value pairs of A and B;
> ALPHA(1:K) = 1,
> BETA(1:K)  = 0,
> and if M-K-L >= 0,
> ALPHA(K+1:K+L) = diag(C),
> BETA(K+1:K+L)  = diag(S),
> or if M-K-L < 0,
> ALPHA(K+1:M)= C, ALPHA(M+1:K+L)= 0
> BETA(K+1:M) = S, BETA(M+1:K+L) = 1.
> Furthermore, if K+L < N,
> ALPHA(K+L+1:N) = 0 and
> BETA(K+L+1:N)  = 0.

U : COMPLEX\*16 array, dimension (LDU,M) [in,out]
> On entry, if JOBU = 'U', U must contain a matrix U1 (usually
> the unitary matrix returned by ZGGSVP).
> On exit,
> if JOBU = 'I', U contains the unitary matrix U;
> if JOBU = 'U', U contains the product U1\*U.
> If JOBU = 'N', U is not referenced.

LDU : INTEGER [in]
> The leading dimension of the array U. LDU >= max(1,M) if
> JOBU = 'U'; LDU >= 1 otherwise.

V : COMPLEX\*16 array, dimension (LDV,P) [in,out]
> On entry, if JOBV = 'V', V must contain a matrix V1 (usually
> the unitary matrix returned by ZGGSVP).
> On exit,
> if JOBV = 'I', V contains the unitary matrix V;
> if JOBV = 'V', V contains the product V1\*V.
> If JOBV = 'N', V is not referenced.

LDV : INTEGER [in]
> The leading dimension of the array V. LDV >= max(1,P) if
> JOBV = 'V'; LDV >= 1 otherwise.

Q : COMPLEX\*16 array, dimension (LDQ,N) [in,out]
> On entry, if JOBQ = 'Q', Q must contain a matrix Q1 (usually
> the unitary matrix returned by ZGGSVP).
> On exit,
> if JOBQ = 'I', Q contains the unitary matrix Q;
> if JOBQ = 'Q', Q contains the product Q1\*Q.
> If JOBQ = 'N', Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q. LDQ >= max(1,N) if
> JOBQ = 'Q'; LDQ >= 1 otherwise.

WORK : COMPLEX\*16 array, dimension (2\*N) [out]

NCYCLE : INTEGER [out]
> The number of cycles required for convergence.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> = 1:  the procedure does not converge after MAXIT cycles.
