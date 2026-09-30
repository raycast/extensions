```fortran
subroutine sggsvd3 (
        character jobu,
        character jobv,
        character jobq,
        integer m,
        integer n,
        integer p,
        integer k,
        integer l,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( * ) alpha,
        real, dimension( * ) beta,
        real, dimension( ldu, * ) u,
        integer ldu,
        real, dimension( ldv, * ) v,
        integer ldv,
        real, dimension( ldq, * ) q,
        integer ldq,
        real, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer info
)
```

SGGSVD3 computes the generalized singular value decomposition (GSVD)
of an M-by-N real matrix A and P-by-N real matrix B:

U\*\*T\*A\*Q = D1\*( 0 R ),    V\*\*T\*B\*Q = D2\*( 0 R )

where U, V and Q are orthogonal matrices.
Let K+L = the effective numerical rank of the matrix (A\*\*T,B\*\*T)\*\*T,
then R is a K+L-by-K+L nonsingular upper triangular matrix, D1 and
D2 are M-by-(K+L) and P-by-(K+L)  matrices and of the
following structures, respectively:

If M-K-L >= 0,

K  L
D1 =     K ( I  0 )
L ( 0  C )
M-K-L ( 0  0 )

K  L
D2 =   L ( 0  S )
P-L ( 0  0 )

N-K-L  K    L
( 0 R ) = K (  0   R11  R12 )
L (  0    0   R22 )

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
D2 =   M-K ( 0  S    0  )
K+L-M ( 0  0    I  )
P-L ( 0  0    0  )

N-K-L  K   M-K  K+L-M
( 0 R ) =     K ( 0    R11  R12  R13  )
M-K ( 0     0   R22  R23  )
K+L-M ( 0     0    0   R33  )

where

C = diag( ALPHA(K+1), ... , ALPHA(M) ),
S = diag( BETA(K+1),  ... , BETA(M) ),
C\*\*2 + S\*\*2 = I.

(R11 R12 R13 ) is stored in A(1:M, N-K-L+1:N), and R33 is stored
( 0  R22 R23 )
in B(M-K+1:L,N+M-K-L+1:N) on exit.

The routine computes C, S, R, and optionally the orthogonal
transformation matrices U, V and Q.

In particular, if B is an N-by-N nonsingular matrix, then the GSVD of
A and B implicitly gives the SVD of A\*inv(B):
A\*inv(B) = U\*(D1\*inv(D2))\*V\*\*T.
If ( A\*\*T,B\*\*T)\*\*T  has orthonormal columns, then the GSVD of A and B is
also equal to the CS decomposition of A and B. Furthermore, the GSVD
can be used to derive the solution of the eigenvalue problem:
A\*\*T\*A x = lambda\* B\*\*T\*B x.
In some literature, the GSVD of A and B is presented in the form
U\*\*T\*A\*X = ( 0 D1 ),   V\*\*T\*B\*X = ( 0 D2 )
where U and V are orthogonal and X is nonsingular, D1 and D2 are
``diagonal''.  The former GSVD form can be converted to the latter
form by taking the nonsingular matrix X as

X = Q\*( I   0    )
( 0 inv(R) ).

## Parameters
JOBU : CHARACTER\*1 [in]
> = 'U':  Orthogonal matrix U is computed;
> = 'N':  U is not computed.

JOBV : CHARACTER\*1 [in]
> = 'V':  Orthogonal matrix V is computed;
> = 'N':  V is not computed.

JOBQ : CHARACTER\*1 [in]
> = 'Q':  Orthogonal matrix Q is computed;
> = 'N':  Q is not computed.

M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrices A and B.  N >= 0.

P : INTEGER [in]
> The number of rows of the matrix B.  P >= 0.

K : INTEGER [out]

L : INTEGER [out]
> 
> On exit, K and L specify the dimension of the subblocks
> described in Purpose.
> K + L = effective numerical rank of (A\*\*T,B\*\*T)\*\*T.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit, A contains the triangular matrix R, or part of R.
> See Purpose for details.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,M).

B : REAL array, dimension (LDB,N) [in,out]
> On entry, the P-by-N matrix B.
> On exit, B contains the triangular matrix R if M-K-L < 0.
> See Purpose for details.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,P).

ALPHA : REAL array, dimension (N) [out]

BETA : REAL array, dimension (N) [out]
> 
> On exit, ALPHA and BETA contain the generalized singular
> value pairs of A and B;
> ALPHA(1:K) = 1,
> BETA(1:K)  = 0,
> and if M-K-L >= 0,
> ALPHA(K+1:K+L) = C,
> BETA(K+1:K+L)  = S,
> or if M-K-L < 0,
> ALPHA(K+1:M)=C, ALPHA(M+1:K+L)=0
> BETA(K+1:M) =S, BETA(M+1:K+L) =1
> and
> ALPHA(K+L+1:N) = 0
> BETA(K+L+1:N)  = 0

U : REAL array, dimension (LDU,M) [out]
> If JOBU = 'U', U contains the M-by-M orthogonal matrix U.
> If JOBU = 'N', U is not referenced.

LDU : INTEGER [in]
> The leading dimension of the array U. LDU >= max(1,M) if
> JOBU = 'U'; LDU >= 1 otherwise.

V : REAL array, dimension (LDV,P) [out]
> If JOBV = 'V', V contains the P-by-P orthogonal matrix V.
> If JOBV = 'N', V is not referenced.

LDV : INTEGER [in]
> The leading dimension of the array V. LDV >= max(1,P) if
> JOBV = 'V'; LDV >= 1 otherwise.

Q : REAL array, dimension (LDQ,N) [out]
> If JOBQ = 'Q', Q contains the N-by-N orthogonal matrix Q.
> If JOBQ = 'N', Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q. LDQ >= max(1,N) if
> JOBQ = 'Q'; LDQ >= 1 otherwise.

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= 1.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (N) [out]
> On exit, IWORK stores the sorting information. More
> precisely, the following loop will sort ALPHA
> for I = K+1, min(M,K+L)
> swap ALPHA(I) and ALPHA(IWORK(I))
> endfor
> such that ALPHA(1) >= ALPHA(2) >= ... >= ALPHA(N).

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, the Jacobi-type procedure failed to
> converge.  For further details, see subroutine STGSJA.
