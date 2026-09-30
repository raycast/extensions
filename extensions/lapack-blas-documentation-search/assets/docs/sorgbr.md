```fortran
subroutine sorgbr (
        character vect,
        integer m,
        integer n,
        integer k,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) tau,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

SORGBR generates one of the real orthogonal matrices Q or P\*\*T
determined by SGEBRD when reducing a real matrix A to bidiagonal
form: A = Q \* B \* P\*\*T.  Q and P\*\*T are defined as products of
elementary reflectors H(i) or G(i) respectively.

If VECT = 'Q', A is assumed to have been an M-by-K matrix, and Q
is of order M:
if m >= k, Q = H(1) H(2) . . . H(k) and SORGBR returns the first n
columns of Q, where m >= n >= k;
if m < k, Q = H(1) H(2) . . . H(m-1) and SORGBR returns Q as an
M-by-M matrix.

If VECT = 'P', A is assumed to have been a K-by-N matrix, and P\*\*T
is of order N:
if k < n, P\*\*T = G(k) . . . G(2) G(1) and SORGBR returns the first m
rows of P\*\*T, where n >= m >= k;
if k >= n, P\*\*T = G(n-1) . . . G(2) G(1) and SORGBR returns P\*\*T as
an N-by-N matrix.

## Parameters
VECT : CHARACTER\*1 [in]
> Specifies whether the matrix Q or the matrix P\*\*T is
> required, as defined in the transformation applied by SGEBRD:
> = 'Q':  generate Q;
> = 'P':  generate P\*\*T.

M : INTEGER [in]
> The number of rows of the matrix Q or P\*\*T to be returned.
> M >= 0.

N : INTEGER [in]
> The number of columns of the matrix Q or P\*\*T to be returned.
> N >= 0.
> If VECT = 'Q', M >= N >= min(M,K);
> if VECT = 'P', N >= M >= min(N,K).

K : INTEGER [in]
> If VECT = 'Q', the number of columns in the original M-by-K
> matrix reduced by SGEBRD.
> If VECT = 'P', the number of rows in the original K-by-N
> matrix reduced by SGEBRD.
> K >= 0.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the vectors which define the elementary reflectors,
> as returned by SGEBRD.
> On exit, the M-by-N matrix Q or P\*\*T.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,M).

TAU : REAL array, dimension [in]
> (min(M,K)) if VECT = 'Q'
> (min(N,K)) if VECT = 'P'
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i) or G(i), which determines Q or P\*\*T, as
> returned by SGEBRD in its array argument TAUQ or TAUP.

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= max(1,min(M,N)).
> For optimum performance LWORK >= min(M,N)\*NB, where NB
> is the optimal blocksize.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
