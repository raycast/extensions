```fortran
subroutine zunmbr (
        character vect,
        character side,
        character trans,
        integer m,
        integer n,
        integer k,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( * ) tau,
        complex*16, dimension( ldc, * ) c,
        integer ldc,
        complex*16, dimension( * ) work,
        integer lwork,
        integer info
)
```

If VECT = 'Q', ZUNMBR overwrites the general complex M-by-N matrix C
with
SIDE = 'L'     SIDE = 'R'
TRANS = 'N':      Q \* C          C \* Q
TRANS = 'C':      Q\*\*H \* C       C \* Q\*\*H

If VECT = 'P', ZUNMBR overwrites the general complex M-by-N matrix C
with
SIDE = 'L'     SIDE = 'R'
TRANS = 'N':      P \* C          C \* P
TRANS = 'C':      P\*\*H \* C       C \* P\*\*H

Here Q and P\*\*H are the unitary matrices determined by ZGEBRD when
reducing a complex matrix A to bidiagonal form: A = Q \* B \* P\*\*H. Q
and P\*\*H are defined as products of elementary reflectors H(i) and
G(i) respectively.

Let nq = m if SIDE = 'L' and nq = n if SIDE = 'R'. Thus nq is the
order of the unitary matrix Q or P\*\*H that is applied.

If VECT = 'Q', A is assumed to have been an NQ-by-K matrix:
if nq >= k, Q = H(1) H(2) . . . H(k);
if nq < k, Q = H(1) H(2) . . . H(nq-1).

If VECT = 'P', A is assumed to have been a K-by-NQ matrix:
if k < nq, P = G(1) G(2) . . . G(k);
if k >= nq, P = G(1) G(2) . . . G(nq-1).

## Parameters
VECT : CHARACTER\*1 [in]
> = 'Q': apply Q or Q\*\*H;
> = 'P': apply P or P\*\*H.

SIDE : CHARACTER\*1 [in]
> = 'L': apply Q, Q\*\*H, P or P\*\*H from the Left;
> = 'R': apply Q, Q\*\*H, P or P\*\*H from the Right.

TRANS : CHARACTER\*1 [in]
> = 'N':  No transpose, apply Q or P;
> = 'C':  Conjugate transpose, apply Q\*\*H or P\*\*H.

M : INTEGER [in]
> The number of rows of the matrix C. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix C. N >= 0.

K : INTEGER [in]
> If VECT = 'Q', the number of columns in the original
> matrix reduced by ZGEBRD.
> If VECT = 'P', the number of rows in the original
> matrix reduced by ZGEBRD.
> K >= 0.

A : COMPLEX\*16 array, dimension [in]
> (LDA,min(nq,K)) if VECT = 'Q'
> (LDA,nq)        if VECT = 'P'
> The vectors which define the elementary reflectors H(i) and
> G(i), whose products determine the matrices Q and P, as
> returned by ZGEBRD.

LDA : INTEGER [in]
> The leading dimension of the array A.
> If VECT = 'Q', LDA >= max(1,nq);
> if VECT = 'P', LDA >= max(1,min(nq,K)).

TAU : COMPLEX\*16 array, dimension (min(nq,K)) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i) or G(i) which determines Q or P, as returned
> by ZGEBRD in the array argument TAUQ or TAUP.

C : COMPLEX\*16 array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by Q\*C or Q\*\*H\*C or C\*Q\*\*H or C\*Q
> or P\*C or P\*\*H\*C or C\*P or C\*P\*\*H.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If SIDE = 'L', LWORK >= max(1,N);
> if SIDE = 'R', LWORK >= max(1,M);
> if N = 0 or M = 0, LWORK >= 1.
> For optimum performance LWORK >= max(1,N\*NB) if SIDE = 'L',
> and LWORK >= max(1,M\*NB) if SIDE = 'R', where NB is the
> optimal blocksize. (NB = 0 if M = 0 or N = 0.)
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
