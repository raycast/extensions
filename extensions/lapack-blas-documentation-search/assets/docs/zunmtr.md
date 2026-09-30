```fortran
subroutine zunmtr (
        character side,
        character uplo,
        character trans,
        integer m,
        integer n,
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

ZUNMTR overwrites the general complex M-by-N matrix C with

SIDE = 'L'     SIDE = 'R'
TRANS = 'N':      Q \* C          C \* Q
TRANS = 'C':      Q\*\*H \* C       C \* Q\*\*H

where Q is a complex unitary matrix of order nq, with nq = m if
SIDE = 'L' and nq = n if SIDE = 'R'. Q is defined as the product of
nq-1 elementary reflectors, as returned by ZHETRD:

if UPLO = 'U', Q = H(nq-1) . . . H(2) H(1);

if UPLO = 'L', Q = H(1) H(2) . . . H(nq-1).

## Parameters
SIDE : CHARACTER\*1 [in]
> = 'L': apply Q or Q\*\*H from the Left;
> = 'R': apply Q or Q\*\*H from the Right.

UPLO : CHARACTER\*1 [in]
> = 'U': Upper triangle of A contains elementary reflectors
> from ZHETRD;
> = 'L': Lower triangle of A contains elementary reflectors
> from ZHETRD.

TRANS : CHARACTER\*1 [in]
> = 'N':  No transpose, apply Q;
> = 'C':  Conjugate transpose, apply Q\*\*H.

M : INTEGER [in]
> The number of rows of the matrix C. M >= 0.

N : INTEGER [in]
> The number of columns of the matrix C. N >= 0.

A : COMPLEX\*16 array, dimension [in]
> (LDA,M) if SIDE = 'L'
> (LDA,N) if SIDE = 'R'
> The vectors which define the elementary reflectors, as
> returned by ZHETRD.

LDA : INTEGER [in]
> The leading dimension of the array A.
> LDA >= max(1,M) if SIDE = 'L'; LDA >= max(1,N) if SIDE = 'R'.

TAU : COMPLEX\*16 array, dimension [in]
> (M-1) if SIDE = 'L'
> (N-1) if SIDE = 'R'
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by ZHETRD.

C : COMPLEX\*16 array, dimension (LDC,N) [in,out]
> On entry, the M-by-N matrix C.
> On exit, C is overwritten by Q\*C or Q\*\*H\*C or C\*Q\*\*H or C\*Q.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M).

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If SIDE = 'L', LWORK >= max(1,N);
> if SIDE = 'R', LWORK >= max(1,M).
> For optimum performance LWORK >= N\*NB if SIDE = 'L', and
> LWORK >=M\*NB if SIDE = 'R', where NB is the optimal
> blocksize.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
